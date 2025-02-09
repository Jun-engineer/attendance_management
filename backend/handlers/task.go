package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"backend/models"
)

// GetTasksHandler retrieves tasks for the authenticated user.
func GetTasksHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get the email set by the JWT middleware.
		email := c.GetString("email")

		var tasks []models.Task
		if err := db.Where("owner_email = ?", email).Find(&tasks).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get tasks"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"tasks": tasks})
	}
}

// CreateTaskHandler creates a new task for the authenticated user.
func CreateTaskHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get the email from the JWT middleware.
		email := c.GetString("email")

		var req struct {
			Title string `json:"title"`
		}
		if err := c.BindJSON(&req); err != nil || req.Title == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
			return
		}

		task := models.Task{
			OwnerEmail: email,
			Title:      req.Title,
		}
		if err := db.Create(&task).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create task"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"task": task})
	}
}

// DeleteTaskHandler deletes a task; route: DELETE /api/tasks/:id.
func DeleteTaskHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		email := c.GetString("email")
		id := c.Param("id")
		var task models.Task

		// Find the task by ID.
		if err := db.First(&task, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
			return
		}

		// Allow deletion only if the authenticated user is the owner.
		if task.OwnerEmail != email {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		if err := db.Delete(&task).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete task"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Task deleted successfully"})
	}
}

// UpdateTaskHandler updates a task; route: PUT /api/tasks/:id.
func UpdateTaskHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		email := c.GetString("email")
		id := c.Param("id")

		var req struct {
			Title     *string `json:"title"`
			Completed *bool   `json:"completed"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
			return
		}

		var task models.Task
		if err := db.First(&task, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
			return
		}

		// Only allow update if the authenticated user is the owner.
		if task.OwnerEmail != email {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		if req.Title != nil && *req.Title != "" {
			task.Title = *req.Title
		}
		if req.Completed != nil {
			task.Completed = *req.Completed
		}
		
		if err := db.Save(&task).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update task"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"task": task})
	}
}