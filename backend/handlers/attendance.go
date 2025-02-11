package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"backend/models"
)

// GetAttendanceHandler retrieves today's attendance record for the authenticated user.
func GetAttendanceHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		email := c.GetString("email")
		if email == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		today := time.Now().Truncate(24 * time.Hour)
		var attendance models.Attendance
		err := db.Where("user_email = ? AND date = ?", email, today).First(&attendance).Error
		// Instead of returning a 404, return a 200 with null attendance.
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusOK, gin.H{"attendance": nil})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch attendance record"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"attendance": attendance})
	}
}

// GetMonthlySummaryHandler returns all attendance records for the given month & year.
func GetMonthlySummaryHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		email := c.GetString("email")
		if email == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		monthStr := c.Query("month")
		yearStr := c.Query("year")
		month, err := strconv.Atoi(monthStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid month"})
			return
		}
		year, err := strconv.Atoi(yearStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid year"})
			return
		}

		// construct start and end date range for the month.
		start := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.Local)
		end := start.AddDate(0, 1, 0)

		var records []models.Attendance
		if err := db.Where("user_email = ? AND date >= ? AND date < ?", email, start, end).
			Order("date asc").Find(&records).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"attendance": records})
	}
}

// StartAttendanceHandler handles POST /api/attendance/start.
// It creates (or updates) today's attendance record with the current time as the start time.
func StartAttendanceHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Retrieve authenticated user's email from context (set by your auth middleware)
		email := c.GetString("email")
		if email == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		// Get today's date (truncate time)
		today := time.Now().Truncate(24 * time.Hour)
		now := time.Now()

		var attendance models.Attendance
		err := db.Where("user_email = ? AND date = ?", email, today).First(&attendance).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// No record for today, create one.
				attendance = models.Attendance{
					UserEmail: email,
					Date:      today,
					StartTime: &now,
				}
				if err := db.Create(&attendance).Error; err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to create attendance record"})
					return
				}
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
				return
			}
		} else {
			// Record exists. If start time is already set, reject duplicate entry.
			if attendance.StartTime != nil {
				c.JSON(http.StatusBadRequest, gin.H{"message": "Start time already recorded"})
				return
			}
			attendance.StartTime = &now
			if err := db.Save(&attendance).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to update attendance record"})
				return
			}
		}
		c.JSON(http.StatusOK, gin.H{"attendance": attendance})
	}
}

// EndAttendanceHandler handles POST /api/attendance/end.
// It updates today's attendance record with the current time as the end time.
func EndAttendanceHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		email := c.GetString("email")
		if email == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		today := time.Now().Truncate(24 * time.Hour)
		var attendance models.Attendance
		err := db.Where("user_email = ? AND date = ?", email, today).First(&attendance).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Attendance record not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}

		// Ensure that the start time is already recorded.
		if attendance.StartTime == nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Start time not recorded yet"})
			return
		}

		// Prevent updating if end time is already recorded.
		if attendance.EndTime != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "End time already recorded"})
			return
		}

		now := time.Now()
		attendance.EndTime = &now
		if err := db.Save(&attendance).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to update attendance record"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"attendance": attendance})
	}
}

// UpdateAttendanceHandler handles POST /api/attendance/update.
// It updates the attendance record for a given date with new start/end times and comment.
func UpdateAttendanceHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Retrieve the email from the context.
		email := c.GetString("email")
		if email == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		// Define the expected JSON payload.
		var updatedData struct {
			Date      string `json:"Date"`      // Expected "2006-01-02"
			StartTime string `json:"StartTime"` // Expected "15:04" or ""
			EndTime   string `json:"EndTime"`   // Expected "15:04" or ""
			Comment   string `json:"Comment"`
		}
		if err := c.BindJSON(&updatedData); err != nil {
			log.Printf("BindJSON error: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input", "details": err.Error()})
			return
		}

		// Log the incoming payload.
		log.Printf("Update payload: %+v", updatedData)

		// Parse the date in "2006-01-02" format.
		parsedDate, err := time.Parse("2006-01-02", updatedData.Date)
		if err != nil {
			log.Printf("Error parsing date: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format", "details": err.Error()})
			return
		}

		// Define the start and end of the day for lookup.
		startOfDay := parsedDate.Truncate(24 * time.Hour)
		endOfDay := startOfDay.Add(24 * time.Hour)

		// Lookup the attendance record using a date range.
		var attendance models.Attendance
		err = db.Where("user_email = ? AND date >= ? AND date < ?", email, startOfDay, endOfDay).First(&attendance).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("Record not found for email %s and date between %v and %v, creating new record", email, startOfDay, endOfDay)
			// Create a new record if not found.
			attendance = models.Attendance{
				UserEmail: email,
				Date:      startOfDay, // Record date at midnight.
				Comment:   updatedData.Comment,
			}

			if updatedData.StartTime != "" {
				st, err := time.Parse("15:04", updatedData.StartTime)
				if err != nil {
					log.Printf("Error parsing start time: %v", err)
					c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start time format", "details": err.Error()})
					return
				}
				newStart := time.Date(startOfDay.Year(), startOfDay.Month(), startOfDay.Day(), st.Hour(), st.Minute(), 0, 0, time.Local)
				attendance.StartTime = &newStart
			}

			if updatedData.EndTime != "" {
				et, err := time.Parse("15:04", updatedData.EndTime)
				if err != nil {
					log.Printf("Error parsing end time: %v", err)
					c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end time format", "details": err.Error()})
					return
				}
				newEnd := time.Date(startOfDay.Year(), startOfDay.Month(), startOfDay.Day(), et.Hour(), et.Minute(), 0, 0, time.Local)
				attendance.EndTime = &newEnd
			}

			if err := db.Create(&attendance).Error; err != nil {
				log.Printf("Error creating new attendance record: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create attendance record", "details": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{"attendance": attendance})
			return
		} else if err != nil {
			log.Printf("Database error during attendance lookup: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error", "details": err.Error()})
			return
		}

		// Record found, update the times.
		if updatedData.StartTime != "" {
			st, err := time.Parse("15:04", updatedData.StartTime)
			if err != nil {
				log.Printf("Error parsing start time: %v", err)
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start time format", "details": err.Error()})
				return
			}
			newStart := time.Date(attendance.Date.Year(), attendance.Date.Month(), attendance.Date.Day(), st.Hour(), st.Minute(), 0, 0, time.Local)
			attendance.StartTime = &newStart
		}

		if updatedData.EndTime != "" {
			et, err := time.Parse("15:04", updatedData.EndTime)
			if err != nil {
				log.Printf("Error parsing end time: %v", err)
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end time format", "details": err.Error()})
				return
			}
			newEnd := time.Date(attendance.Date.Year(), attendance.Date.Month(), attendance.Date.Day(), et.Hour(), et.Minute(), 0, 0, time.Local)
			attendance.EndTime = &newEnd
		}

		attendance.Comment = updatedData.Comment

		// Log the attendance record before saving.
		log.Printf("Updating attendance record: %+v", attendance)

		if err := db.Save(&attendance).Error; err != nil {
			log.Printf("Error saving attendance record: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update attendance record", "details": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"attendance": attendance})
	}
}
