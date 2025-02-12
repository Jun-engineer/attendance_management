package config

import (
	"fmt"
	"os"

	"backend/models"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func InitEnv() error {
	if err := godotenv.Load(); err != nil {
		return fmt.Errorf("failed to load .env file: %v", err)
	}
	return nil
}

func InitDB() (*gorm.DB, error) {
	// Load database DSN from environment variables.
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		// Fallback DSN for development (adjust as needed).
		dsn = "host=localhost user=myuser password=mypassword dbname=attendance port=5432 sslmode=disable TimeZone=Asia/Tokyo"
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(&models.User{}, &models.Task{}, &models.Attendance{}); err != nil {
		return nil, err
	}

	fmt.Println("Database initialized successfully")
	return db, nil
}
