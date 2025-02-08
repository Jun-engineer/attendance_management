'use client';

import Link from 'next/link';
import { signOut, useSession } from "next-auth/react";

export default function Dashboard() {
  const { data: session } = useSession();

  // セッションがない場合はリダイレクトさせる（必要なら追加）
  if (!session) {
    return <p>Please Login Again.</p>;
  }

  const handleLogout = () => {
    // signOut を呼び出してセッションをクリアし、コールバックURLにリダイレクトする
    signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="container">
      <div className="content">
        <h1>Attendance Management System</h1>
        <p>Dashboard here</p>
        <button onClick={handleLogout}>Logout</button>
        <p><Link href="/">Back to Top</Link></p>
      </div>
    </div>
  );
}