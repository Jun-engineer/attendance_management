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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-900 to-blue-900 text-white p-4">
      <div className="w-full max-w-3xl bg-black bg-opacity-50 rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Document Management</h1>
        <form onSubmit={handleUpload} className="flex flex-col items-center gap-4 mb-6">
          <input
            type="file"
            onChange={handleFileChange}
            className="p-2 rounded-md text-black"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition"
          >
            Upload
          </button>
        </form>
        {uploadMessage && <p className="text-center mb-4">{uploadMessage}</p>}
        <div className="flex items-center justify-center mb-6">
          <button
            onClick={() => handleDownload("attendance.pdf")}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md transition"
          >
            Download attendance.pdf
          </button>
        </div>
        <p className="text-center">
          <Link href="/dashboard/" className="text-blue-500 underline">
            Back to Dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}