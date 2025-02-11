/*
  * Dashboard page
  * This page is only accessible to authenticated users.
  * It shows the user's profile information and a button to logout.
  * 
  * Features:
  * Replace sqlite3 with PostgreSQL and Redis
  * Chat Functionality （WebSocket）
  * Email Notification （プッシュ通知）
  * Document Management （ファイルアップロード・ダウンロード）
  * Multilingual Support
  * External Service Integration （Googleカレンダー、Googleドライブ）

*/

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
      <div>
        <p>Please Login Again.</p>
        <p><Link href="/">Back to Top</Link></p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="content">
        <h1>Attendance Management System</h1>
        <p>Dashboard here</p>
        {protectedData && <p>{protectedData}</p>}
        <p><Link href="/task/">Task Manager</Link></p>
        <p><Link href="/attendance/">Attendance</Link></p>
        <p><Link href="/chat/">Chat</Link></p>
        <p><Link href="/mail/">Mail</Link></p>
        <p><Link href="/document/">Document</Link></p>
        <p><Link href="/profile/">Profile</Link></p>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
}