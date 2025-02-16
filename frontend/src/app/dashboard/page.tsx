'use client';

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [protectedData, setProtectedData] = useState<string>("");

  // When status is done loading and there is no session, redirect to login
  useEffect(() => {
    if (status !== "loading" && !session) {
      router.push("/login/");
    }
  }, [session, status, router]);

  // Fetch protected data if there is a session
  useEffect(() => {
    const fetchProtectedData = async () => {
      try {
        const response = await fetch("/api/protected/", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Send cookies
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch protected data");
        }
        const data = await response.json();
        setProtectedData(data.message);
      } catch (error) {
        console.error("Error fetching protected data:", error);
      }
    };
    fetchProtectedData();
  }, [session]);

  const handleLogout = () => {
    signOut({ callbackUrl: "/login/" });
  };

  // Show a loading message until the session status is resolved
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="p-6 bg-white shadow rounded-lg">
          <p className="text-lg font-medium">Please Login Again.</p>
          <p>
            <Link href="/" className="text-blue-500 underline">
              Back to Top
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-900 to-blue-900 text-white flex items-center justify-center">
      <div className="w-full max-w-3xl p-8 bg-black bg-opacity-50 rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold mb-4 text-center">Learning Web Application Development</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Link href="/task/" className="block text-center px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-md">
              Task Manager
          </Link>
          <Link href="/attendance/" className="block text-center px-4 py-3 bg-green-600 hover:bg-green-700 rounded-md">
              Attendance
          </Link>
          <Link href="/chat/" className="block text-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-md">
              Chat
          </Link>
          <Link href="/mail/" className="block text-center px-4 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-md">
              Mail
          </Link>
          <Link href="/document/" className="block text-center px-4 py-3 bg-red-600 hover:bg-red-700 rounded-md">
              Document
          </Link>
          <Link href="/reservation/" className="block text-center px-4 py-3 bg-teal-600 hover:bg-teal-700 rounded-md">
              Reservation
          </Link>
          <Link href="/profile/" className="block text-center px-4 py-3 bg-teal-600 hover:bg-teal-700 rounded-md">
              Profile
          </Link>
        </div>
        <div className="flex justify-center">
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-md transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}