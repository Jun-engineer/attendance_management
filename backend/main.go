package main

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/golang-jwt/jwt/v4"
	"golang.org/x/crypto/bcrypt"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var db *gorm.DB
var secretKey []byte

type User struct {
	gorm.Model
	Email    string `gorm:"uniqueIndex;not null"`
	Password string `gorm:"not null"`
}

func initDB() {
	var err error
	db, err = gorm.Open(sqlite.Open("attendance.db"), &gorm.Config{})
	if err != nil {
		fmt.Printf("Failed to connect to database: %v", err)
		os.Exit(1)
	}

	if err := db.AutoMigrate(&User{}); err != nil {
		fmt.Printf("Failed to migrate database: %v", err)
		os.Exit(1)
	}

	fmt.Println("Database initialized successfully")
}

func initEnv() error {
    err := godotenv.Load()
    if err != nil {
        return fmt.Errorf("Failed to load .env file: %v", err)
    }

    if os.Getenv("JWT_SECRET") == "" {
        return fmt.Errorf("JWT_SECRET is not set in the .env file")
    }

    return nil
}

func init() {
    if err := initEnv(); err != nil {
        fmt.Printf("Failed to initialize environment variables: %v\n", err)
		os.Exit(1)
    }
	secretKey = []byte(os.Getenv("JWT_SECRET"))
}

func generateToken(email string) (string, error) {
	claims := jwt.MapClaims{
		"email": email,
		"iat":   time.Now().Unix(),
		"exp":   time.Now().Add(time.Hour * 6).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	return token.SignedString(secretKey)
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get the JWT token
		cookie, err := c.Request.Cookie("next-auth.session-token")
		if err != nil || cookie.Value == "" {
			fmt.Println("Cookie retrieval error:", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token is required"})
			c.Abort()
			return
		}

		tokenString := cookie.Value

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Check the SigningMethod
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}

			return secretKey, nil
		})

		if err != nil || !token.Valid {
			fmt.Println("Token parse error:", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Retrieve user information from the token and set it in the context
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			c.Set("email", claims["email"])
		}
		c.Next()
	}
}

// Login endpoint (POST /login)
// Expects request body { "email": "xxx", "password": "xxx" } and returns JWT on successful authentication
func loginHandler(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	req.Email = strings.TrimSpace(req.Email)
	req.Password = strings.TrimSpace(req.Password)
	if req.Email == "" || req.Password == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email and password are required"})
		return
	}

	var user User
	if err := db.Where("email = ?", req.Email).First(&user).Error; errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	token, err := generateToken(user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"email": user.Email,
		"token": token,
	})
}

// User registration endpoint (POST /register)
// Expects request body { "email": "xxx", "password": "xxx" }
func registerHandler(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	req.Email = strings.TrimSpace(req.Email)
	req.Password = strings.TrimSpace(req.Password)
	if req.Email == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email and password cannot be empty"})
		return
	}

	// Check for an existing user (including soft-deleted ones).
    var existing User
    err := db.Unscoped().Where("email = ?", req.Email).First(&existing).Error
    if err == nil {
        // If a record exists:
        // If it's not soft-deleted, then it is active.
        if existing.DeletedAt.Time.IsZero() {
            c.JSON(http.StatusConflict, gin.H{"error": "User already exists"})
            return
        }
        // Otherwise, the record is soft-deleted and can be re-activated.
        // (Option 1: Update the record with a new password and clear DeletedAt)
        hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
            return
        }
        existing.Password = string(hashedPassword)
        // Clear the soft delete flag
        existing.DeletedAt.Time = time.Time{}
        existing.DeletedAt.Valid = false
        if err := db.Unscoped().Save(&existing).Error; err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to re-register user"})
            return
        }
        c.JSON(http.StatusCreated, gin.H{"message": "User re-registered successfully"})
        return
    }

	// If no record exists, create a new one.
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
        return
    }

	user := User{
		Email:    req.Email,
		Password: string(hashedPassword),
	}
	if err := db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully"})
}

func changePasswordHandler(c *gin.Context) {
    // Get the email set by the JWT middleware
    email := c.GetString("email")
    if email == "" {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
        return
    }

    var req struct {
        OldPassword string `json:"oldPassword"`
        NewPassword string `json:"newPassword"`
    }
    if err := c.BindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
        return
    }

    // Get the user from the database
    var user User
    if err := db.Where("email = ?", email).First(&user).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
        return
    }

    // Verify the old password
    if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword)); err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Old password is incorrect"})
        return
    }

    // Hash the new password
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash new password"})
        return
    }

    // Update the password
    user.Password = string(hashedPassword)
    if err := db.Save(&user).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully"})
}

func deleteAccountHandler(c *gin.Context) {
    // Get the email set by the JWT middleware
    email := c.GetString("email")
    if email == "" {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
        return
    }

    // Delete the user account
    if err := db.Where("email = ?", email).Delete(&User{}).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete account"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Account deleted successfully"})
}

func main() {
	initDB()

	r := gin.Default()

	// Set trusted proxies for the X-Forwarded-For header
	if err := r.SetTrustedProxies([]string{"127.0.0.1"}); err != nil {
		fmt.Println("Proxy setting error: ", err)
	}

	// Set up CORS
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "http://localhost")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	})

	// Set up routes
	r.POST("/api/login/", loginHandler)
	r.POST("/api/register/", registerHandler)
    r.PUT("/api/user/password/", authMiddleware(), changePasswordHandler)
    r.DELETE("/api/user/", authMiddleware(), deleteAccountHandler)
	r.GET("/api/protected/", authMiddleware(), func(c *gin.Context) {
		email := c.GetString("email")
		c.JSON(http.StatusOK, gin.H{"message": "You have access!", "email": email})
	})

	fmt.Println("Server is running on :8080")
	r.Run(":8080")
}
