package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// upgrader upgrades HTTP connection to a WebSocket connection.
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow all connections by default (adjust as needed).
		return true
	},
}

// ChatHandler handles WebSocket connections for chatting.
func ChatHandler(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer conn.Close()

	for {
		// Read message from client.
		messageType, message, err := conn.ReadMessage()
		if err != nil {
			break
		}

		// For now, simply echo back the message.
		if err := conn.WriteMessage(messageType, message); err != nil {
			break
		}
	}
}
