package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetReservationsHandler returns all reservations.
func GetReservationsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var reservations []models.Reservation
		if err := db.Find(&reservations).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not retrieve reservations"})
			return
		}
		c.JSON(http.StatusOK, reservations)
	}
}

// CreateReservationHandler creates a new reservation.
func CreateReservationHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var reservation models.Reservation
		if err := c.ShouldBindJSON(&reservation); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
			return
		}

		now := time.Now()
		reservation.CreatedAt = now
		reservation.UpdatedAt = now

		if err := db.Create(&reservation).Error; err != nil {
			// Log the error here
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to create reservation: %v", err)})
			return
		}
		c.JSON(http.StatusOK, reservation)
	}
}

// UpdateReservationHandler updates an existing reservation.
func UpdateReservationHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		idParam := c.Param("id")
		id, err := strconv.Atoi(idParam)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reservation ID"})
			return
		}
		var reservation models.Reservation
		if err := db.First(&reservation, id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Reservation not found"})
			return
		}
		var updateData models.Reservation
		if err := c.BindJSON(&updateData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid update payload"})
			return
		}
		reservation.Title = updateData.Title
		reservation.StartTime = updateData.StartTime
		reservation.EndTime = updateData.EndTime
		reservation.UpdatedAt = time.Now()

		if err := db.Save(&reservation).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update reservation"})
			return
		}
		c.JSON(http.StatusOK, reservation)
	}
}

// DeleteReservationHandler cancels a reservation.
func DeleteReservationHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		idParam := c.Param("id")
		id, err := strconv.Atoi(idParam)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reservation ID"})
			return
		}
		if err := db.Delete(&models.Reservation{}, id).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete reservation"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Reservation cancelled"})
	}
}
