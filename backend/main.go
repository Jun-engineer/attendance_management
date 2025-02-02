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

// initEnvは.envファイルから環境変数を読み込みます
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

// グローバルなDB変数
var db *gorm.DB

// JWT署名に使用する秘密鍵
var secretKey = []byte(os.Getenv("JWT_SECRET"))

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
		panic(fmt.Sprintf("Failed to connect to database: %v", err))
	}

	// Userモデルのマイグレーション
	if err := db.AutoMigrate(&User{}); err != nil {
		panic(fmt.Sprintf("Failed to migrate database: %v", err))
	}

	fmt.Println("Database initialized successfully")
}

// JWTトークンを生成する関数
func generateToken(email string) (string, error) {
	claims := jwt.MapClaims{
		"email": email,
		"exp":   time.Now().Add(time.Hour * 24).Unix(), // 24時間有効
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secretKey)
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

	// 既存ユーザーのチェック
	var existing User
	if err := db.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User already exists"})
		return
	}

	// パスワードのハッシュ化
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

	c.JSON(http.StatusOK, gin.H{"token": token})
}

func main() {
	initDB()

	r := gin.Default()

	// CORSの設定（Next.jsと通信するため）
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*") // 本番ではフロントエンドのURLに限定するのが望ましい
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	})

	// エンドポイントの設定
	r.POST("/register", registerHandler)
	r.POST("/login", loginHandler)

	fmt.Println("Server is running on :8080")
	r.Run(":8080")
}
