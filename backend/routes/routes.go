package routes

import (
    "log"
    "net/http"

    "github.com/gin-gonic/gin"
    "gorm.io/gorm"

    "backend/handlers"
    "backend/middleware"
)

// SetupRoutes configures the Gin engine with all routes and middleware.
func SetupRoutes(db *gorm.DB) *gin.Engine {
    r := gin.Default()

    // Set trusted proxies for the X-Forwarded-For header.
    if err := r.SetTrustedProxies([]string{"127.0.0.1"}); err != nil {
        // Log the error and continue with default settings.
        log.Println("Error setting trusted proxies: ", err)
    }

    // Setup CORS middleware.
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

    // Set up auth routes.
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

    // Set up task routes.
    tasks := r.Group("/api/tasks", middleware.AuthMiddleware())
    {
        tasks.GET("/", handlers.GetTasksHandler(db))
        tasks.POST("/", handlers.CreateTaskHandler(db))
        tasks.DELETE("/:id", handlers.DeleteTaskHandler(db))
        tasks.PUT("/:id", handlers.UpdateTaskHandler(db))
    }

    return r
}