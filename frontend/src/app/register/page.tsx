"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch("/api/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: password }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setMessage(errorData.error || "Registration failed");
      } else {
        setMessage("Registration successful! Redirecting to login page...");
        setTimeout(() => {
          router.push("/login/");
        }, 1500);
      }
    } catch (error) {
      console.error("Registration error:", error);
      setMessage("Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-900 to-blue-900 p-6">
      <div className="w-full max-w-md bg-black bg-opacity-50 rounded-lg shadow-xl p-8">
        <h1 className="text-center text-2xl font-bold mb-6">
          User Registration
        </h1>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <input
              type="text"
              id="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 rounded-md text-black"
            />
          </div>
          <div>
            <input
              type="password"
              id="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 rounded-md text-black"
            />
          </div>
          <div>
            <button
              type="submit"
              id="registerButton"
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-md transition"
            >
              Register
            </button>
          </div>
        </form>
        {message && <p className="mt-4 text-center">{message}</p>}
        <p className="mt-6 text-center">
          You already have an account?{" "}
          <Link href="/login/">
            <span className="text-blue-400 underline">Login here</span>
          </Link>
        </p>
        <p className="mt-4 text-center">
          <Link href="/">
            <span className="text-blue-400 underline">Back to Top</span>
          </Link>
        </p>
      </div>
    </div>
  );
}
