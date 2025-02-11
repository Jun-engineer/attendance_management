package config

import (
	"fmt"

	"backend/models"

	"github.com/joho/godotenv"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func InitDB() (*gorm.DB, error) {
	db, err := gorm.Open(sqlite.Open("attendance.db"), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(&models.User{}, &models.Task{}, &models.Attendance{}); err != nil {
		return nil, err
	}

	fmt.Println("Database initialized successfully")
	return db, nil
}

func InitEnv() error {
	if err := godotenv.Load(); err != nil {
		return fmt.Errorf("Failed to load .env file: %v", err)
	}
	return nil
}
