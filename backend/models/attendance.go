package models

import (
	"time"

	"gorm.io/gorm"
)

type Attendance struct {
	gorm.Model
	UserEmail string     `json:"UserEmail"`
	Date      time.Time  `json:"Date"`      // The day of the attendance record (typically truncated to midnight)
	StartTime *time.Time `json:"StartTime"` // Nullable: time when work started
	EndTime   *time.Time `json:"EndTime"`   // Nullable: time when work ended
	Comment   string     `json:"Comment"`   // Optional comment
}
