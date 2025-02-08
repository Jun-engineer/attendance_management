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

// グローバルなDB変数
var db *gorm.DB

// JWT署名に使用する秘密鍵
var secretKey []byte

// Userモデル
type User struct {
	gorm.Model
	Email    string `gorm:"uniqueIndex;not null"`
	Password string `gorm:"not null"`
}

// DBの初期化
func initDB() {
	var err error
	db, err = gorm.Open(sqlite.Open("attendance.db"), &gorm.Config{})
	if err != nil {
		fmt.Printf("Failed to connect to database: %v", err)
		os.Exit(1)
	}

	// Userモデルのマイグレーション
	if err := db.AutoMigrate(&User{}); err != nil {
		fmt.Printf("Failed to migrate database: %v", err)
		os.Exit(1)
	}

	fmt.Println("Database initialized successfully")
}

// .envファイルから環境変数を読み込む
func initEnv() error {
    err := godotenv.Load()
    if err != nil {
        return fmt.Errorf(".envファイルの読み込みに失敗しました: %v", err)
    }

    if os.Getenv("JWT_SECRET") == "" {
        return fmt.Errorf("JWT_SECRETが.envファイルに設定されていません")
    }

    return nil
}

// init関数で環境変数を読み込む
func init() {
    if err := initEnv(); err != nil {
        fmt.Printf("Failed to initialize environment variables: %v\n", err)
		os.Exit(1)
    }
	secretKey = []byte(os.Getenv("JWT_SECRET"))
}

// JWTトークンを生成する関数
func generateToken(email string) (string, error) {
	claims := jwt.MapClaims{
		"email": email,
		"iat":   time.Now().Unix(),
		"exp":   time.Now().Add(time.Hour * 6).Unix(), // 6時間有効
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	return token.SignedString(secretKey)
}

// JWT検証ミドルウェア
func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// JWTトークンを取得
		cookie, err := c.Request.Cookie("next-auth.session-token")
		if err != nil || cookie.Value == "" {
			fmt.Println("Cookie retrieval error:", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token is required"})
			c.Abort()
			return
		}

		tokenString := cookie.Value

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// SigningMethodのチェック
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

		// トークンからユーザー情報を取得し、コンテキストに設定
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			c.Set("email", claims["email"])
		}
		c.Next()
	}
}

// ログインエンドポイント（POST /login）
// リクエストボディに { "email": "xxx", "password": "xxx" } を期待し、認証に成功すればJWTを返す
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

// ユーザー登録エンドポイント（POST /register）
// リクエストボディに { "email": "xxx", "password": "xxx" } を期待する
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
    // JWTミドルウェアでセットされたemailを取得
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

    // ユーザー情報をDBから取得
    var user User
    if err := db.Where("email = ?", email).First(&user).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
        return
    }

    // 既存のパスワードが正しいか検証
    if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword)); err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Old password is incorrect"})
        return
    }

    // 新しいパスワードをハッシュ化
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash new password"})
        return
    }

    // パスワードを更新
    user.Password = string(hashedPassword)
    if err := db.Save(&user).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully"})
}

func deleteAccountHandler(c *gin.Context) {
    // JWTミドルウェアでセットされたemailを取得
    email := c.GetString("email")
    if email == "" {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
        return
    }

    // ユーザーを削除
    if err := db.Where("email = ?", email).Delete(&User{}).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete account"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Account deleted successfully"})
}

func main() {
	initDB()

	r := gin.Default()

	// 信頼するプロキシを設定
	if err := r.SetTrustedProxies([]string{"127.0.0.1"}); err != nil {
		fmt.Println("Proxy setting error: ", err)
	}

	// CORSの設定（Next.jsと通信するため）
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

	// エンドポイントの設定
	r.POST("/api/login/", loginHandler)
	r.POST("/api/register/", registerHandler)
    r.PUT("/api/user/password/", authMiddleware(), changePasswordHandler)
    r.DELETE("/api/user/", authMiddleware(), deleteAccountHandler)

	// 保護されたエンドポイント例
	r.GET("/api/protected/", authMiddleware(), func(c *gin.Context) {
		email := c.GetString("email")
		c.JSON(http.StatusOK, gin.H{"message": "You have access!", "email": email})
	})

	fmt.Println("Server is running on :8080")
	r.Run(":8080")
}
