package handlers

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

const uploadDir = "./uploads"

// UploadDocumentHandler handles file uploads.
func UploadDocumentHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Retrieve file from form data
		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No file is received"})
			return
		}

		// Ensure upload directory exists.
		if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create upload directory"})
			return
		}

		// Full path for storing the file. (For production, sanitize file.Filename!)
		filePath := filepath.Join(uploadDir, file.Filename)
		if err := c.SaveUploadedFile(file, filePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to save the file"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "File uploaded successfully", "file": file.Filename})
	}
}

// DownloadDocumentHandler handles file downloads.
// The filename parameter is retrieved from the URL.
func DownloadDocumentHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		filename := c.Param("filename")
		filePath := filepath.Join(uploadDir, filename)

		// Check if file exists.
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}

		// Send file as attachment for download.
		c.FileAttachment(filePath, filename)
	}
}
