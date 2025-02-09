package models

import (
	"gorm.io/gorm"
)

type Task struct {
	gorm.Model
	OwnerEmail string `gorm:"index;not null"`
	Title      string `gorm:"not null"`
	Completed  bool   `gorm:"default:false"`
}
