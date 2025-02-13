'use client';

import React, { useEffect, useState, useRef } from 'react';

export default function ChatPage() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to websocket endpoint. Adjust the domain/port if needed.
    ws.current = new WebSocket("ws://localhost/ws/chat");
    ws.current.onopen = () => {
      console.log("Connected to chat");
    };
    ws.current.onmessage = (event) => {
      setMessages((prev) => [...prev, event.data]);
    };
    ws.current.onerror = (error) => {
      console.error("WebSocket error", error);
    };
    ws.current.onclose = () => {
      console.log("Disconnected from chat");
    };

    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
    };
  }, []);

  const sendMessage = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN && input.trim()) {
      ws.current.send(input);
      setInput("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-purple-900 to-blue-900 text-white p-4">
      <div className="w-full max-w-3xl bg-black bg-opacity-50 rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Chat Room</h1>
        <div className="border border-gray-400 rounded-md p-2 h-64 mb-4 overflow-y-scroll bg-black bg-opacity-20">
          {messages.map((msg, i) => (
            <p key={i} className="mb-1">{msg}</p>
          ))}
        </div>
        <div className="flex">
          <input
            type="text"
            className="flex-grow p-2 rounded-l-md text-black"
            placeholder="Enter your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-r-md"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}