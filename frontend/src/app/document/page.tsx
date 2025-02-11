"use client";

import { useState } from "react";
import Link from "next/link";

export default function DocumentPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/document/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setUploadMessage(data.message);
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  const handleDownload = (filename: string) => {
    // This will trigger the browser to download the file.
    window.location.href = `/api/document/download/${filename}`;
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Document Management</h1>
      <form onSubmit={handleUpload}>
        <input type="file" onChange={handleFileChange} />
        <button type="submit">Upload</button>
      </form>
      {uploadMessage && <p>{uploadMessage}</p>}
      {/* Example download button. In a real app, you might list available files */}
      <button onClick={() => handleDownload("attendance.pdf")} style={{ marginTop: "1rem" }}>
        Download attendance.pdf
      </button>
      <p style={{ marginTop: "20px" }}>
        <Link href="/dashboard/">Back to Dashboard</Link>
      </p>
    </div>
  );
}