package main

import (
	"fmt"
	"log"
	"os"

	"backend/config"
	"backend/middleware"
	"backend/routes"
)

func main() {
	// Load environment variables.
	if err := config.InitEnv(); err != nil {
		log.Fatalf("Error loading environment: %v", err)
	}

	// Initialize the database.
	db, err := config.InitDB()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	if err := config.InitRedis(); err != nil {
		log.Fatalf("Failed to initialize Redis: %v", err)
	}

	// Initialize the secret key for JWT.
	middleware.InitSecret()

	// Set up all routes.
	r := routes.SetupRoutes(db)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Server is running on :%s\n", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}
