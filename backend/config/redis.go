package config

import (
	"context"
	"os"
	"strings"
	"time"

	"github.com/go-redis/redis/v8"
)

var RedisClient *redis.Client

func InitRedis() error {
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	// Trim any spaces from the environment variable.
	redisPassword := strings.TrimSpace(os.Getenv("REDIS_PASSWORD"))

	RedisClient = redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: redisPassword, // Will be empty string if no password is set.
		DB:       0,             // default DB.
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if _, err := RedisClient.Ping(ctx).Result(); err != nil {
		return err
	}

	return nil
}
