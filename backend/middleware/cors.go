package middleware

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware returns a Gin middleware function for handling CORS.
// It reads the allowed origin from the environment variable ALLOWED_ORIGIN,
// defaulting to "http://localhost" if not set.
func CORSMiddleware() gin.HandlerFunc {
	allowedOrigin := os.Getenv("ALLOWED_ORIGIN")
	if allowedOrigin == "" {
		allowedOrigin = "http://localhost"
	}

	return func(c *gin.Context) {
		// If this is a WebSocket upgrade, skip CORS processing.
		if c.Request.Header.Get("Upgrade") == "websocket" {
			c.Next()
			return
		}

		c.Writer.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")

		// If it's an OPTIONS request, abort with no content.
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
