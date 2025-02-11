package middleware

import (
	"fmt"
	"net/http"
	"os"
	
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"	
)

var secretKey []byte

func InitSecret() {
	secretKey = []byte(os.Getenv("JWT_SECRET"))
}

func AuthMiddleware() gin.HandlerFunc {
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
