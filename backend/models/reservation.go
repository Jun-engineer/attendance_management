package models

import (
	"time"

	"gorm.io/gorm"
)

// Reservation represents a reservation entry.
type Reservation struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `json:"-"` // omit deleted_at field from JSON
	UserEmail string         `json:"userEmail"`
	Title     string         `json:"title"`     // e.g., user's name or reservation title
	StartTime time.Time      `json:"startTime"` // Start time of the reservation
	EndTime   time.Time      `json:"endTime"`   // End time of the reservation
}

// TableName overrides the table name used by GORM.
func (Reservation) TableName() string {
	return "reservations" // change to the actual table name in your database
}
