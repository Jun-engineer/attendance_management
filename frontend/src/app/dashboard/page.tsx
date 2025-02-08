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
          credentials: "include", // Cookieを送信するために必要
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch protected data");
        }
        const data = await response.json();
        // ここではdata.messageなどを期待
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
        <p><Link href="/profile/">Profile</Link></p>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
}