package handlers

import (
    "errors"
    "net/http"
    "os"
    "strings"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/golang-jwt/jwt/v4"
    "golang.org/x/crypto/bcrypt"
    "gorm.io/gorm"

    "backend/models"
)

// generateToken creates a JWT for the given email.
// In production, load your secret from environment variables.
func generateToken(email string) (string, error) {
    secret := []byte(os.Getenv("JWT_SECRET"))
    if len(secret) == 0 {
        secret = []byte("your_jwt_secret") // fallback secret; replace in production
    }

    claims := jwt.MapClaims{
        "email": email,
        "exp":   time.Now().Add(72 * time.Hour).Unix(),
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(secret)
}

// LoginHandler handles user login. Expects { "email": ..., "password": ... }.
func LoginHandler(db *gorm.DB) gin.HandlerFunc {
    return func(c *gin.Context) {
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

        var user models.User
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
}

// RegisterHandler handles user registration. Expects { "email": ..., "password": ... }.
func RegisterHandler(db *gorm.DB) gin.HandlerFunc {
    return func(c *gin.Context) {
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
        var existing models.User
        err := db.Unscoped().Where("email = ?", req.Email).First(&existing).Error
        if err == nil {
            // If record exists and is active (not soft-deleted), return conflict.
            if existing.DeletedAt.Time.IsZero() {
                c.JSON(http.StatusConflict, gin.H{"error": "User already exists"})
                return
            }
            // Otherwise, re-activate soft-deleted user.
            hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
            if err != nil {
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
                return
            }
            existing.Password = string(hashedPassword)
            existing.DeletedAt.Time = time.Time{}
            existing.DeletedAt.Valid = false
            if err := db.Unscoped().Save(&existing).Error; err != nil {
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to re-register user"})
                return
            }
            c.JSON(http.StatusCreated, gin.H{"message": "User re-registered successfully"})
            return
        }

        // Create a new user if not existed.
        hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
            return
        }

        user := models.User{
            Email:    req.Email,
            Password: string(hashedPassword),
        }
        if err := db.Create(&user).Error; err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
            return
        }

        c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully"})
    }
}

// ChangePasswordHandler allows an authenticated user to change their password.
func ChangePasswordHandler(db *gorm.DB) gin.HandlerFunc {
    return func(c *gin.Context) {
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

        var user models.User
        if err := db.Where("email = ?", email).First(&user).Error; err != nil {
            c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
            return
        }

        if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword)); err != nil {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Old password is incorrect"})
            return
        }

        hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash new password"})
            return
        }

        user.Password = string(hashedPassword)
        if err := db.Save(&user).Error; err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
            return
        }

        c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully"})
    }
}

// DeleteAccountHandler deletes the authenticated user's account.
func DeleteAccountHandler(db *gorm.DB) gin.HandlerFunc {
    return func(c *gin.Context) {
        email := c.GetString("email")
        if email == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
            return
        }

        if err := db.Where("email = ?", email).Delete(&models.User{}).Error; err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete account"})
            return
        }

        c.JSON(http.StatusOK, gin.H{"message": "Account deleted successfully"})
    }
}