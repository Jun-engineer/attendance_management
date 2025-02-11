package routes

import (
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"backend/handlers"
	"backend/middleware"
)

// SetupRoutes configures the Gin engine with all routes and middleware.
func SetupRoutes(db *gorm.DB) *gin.Engine {
	r := gin.Default()

	// Load trusted proxies from environment variable TRUSTED_PROXIES.
	// The variable should be a comma-separated list, e.g. "127.0.0.1,192.168.0.1".
	proxiesEnv := os.Getenv("TRUSTED_PROXIES")
	var proxies []string
	if proxiesEnv == "" {
		proxies = []string{"127.0.0.1"}
	} else {
		// Trim spaces for each proxy.
		for _, proxy := range strings.Split(proxiesEnv, ",") {
			proxies = append(proxies, strings.TrimSpace(proxy))
		}
	}
	if err := r.SetTrustedProxies(proxies); err != nil {
		log.Println("Error setting trusted proxies:", err)
	}

	// Use the extracted CORS middleware.
	r.Use(middleware.CORSMiddleware())

	// Register routes by grouping them into submodules.
	registerAuthRoutes(r, db)
	registerTaskRoutes(r, db)
	registerAttendanceRoutes(r, db)

	return r
}

// registerAuthRoutes groups and registers authentication and user-related endpoints.
func registerAuthRoutes(r *gin.Engine, db *gorm.DB) {
	auth := r.Group("/api")
	{
		auth.POST("/login/", handlers.LoginHandler(db))
		auth.POST("/register/", handlers.RegisterHandler(db))
		auth.PUT("/user/password/", middleware.AuthMiddleware(), handlers.ChangePasswordHandler(db))
		auth.DELETE("/user/", middleware.AuthMiddleware(), handlers.DeleteAccountHandler(db))
		auth.GET("/protected/", middleware.AuthMiddleware(), func(c *gin.Context) {
			email := c.GetString("email")
			c.JSON(http.StatusOK, gin.H{
				"message": "You have access!",
				"email":   email,
			})
		})
	}
}

// registerTaskRoutes groups and registers task management endpoints.
func registerTaskRoutes(r *gin.Engine, db *gorm.DB) {
	tasks := r.Group("/api/tasks", middleware.AuthMiddleware())
	{
		tasks.GET("/", handlers.GetTasksHandler(db))
		tasks.POST("/", handlers.CreateTaskHandler(db))
		tasks.DELETE("/:id", handlers.DeleteTaskHandler(db))
		tasks.PUT("/:id", handlers.UpdateTaskHandler(db))
	}
}

// registerAttendanceRoutes groups and registers attendance management endpoints.
func registerAttendanceRoutes(r *gin.Engine, db *gorm.DB) {
	attendance := r.Group("/api/attendance", middleware.AuthMiddleware())
	{
		attendance.GET("/", handlers.GetAttendanceHandler(db))
		attendance.GET("/monthly", handlers.GetMonthlySummaryHandler(db))
		attendance.POST("/start", handlers.StartAttendanceHandler(db))
		attendance.POST("/end", handlers.EndAttendanceHandler(db))
		attendance.POST("/update", handlers.UpdateAttendanceHandler(db))
	}
}
