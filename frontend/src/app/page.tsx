"use client";

import Link from 'next/link';

export default function Home() {
  return (
    <div className="container">
      <div className="content">
        <h1>Attendance Management System</h1>
        
        <Link href="/login/"><button id="signInButton">Sign In</button></Link>
        <Link href="/register/"><button id="signUpButton">Sign Up</button></Link>
      </div>
    </div>
  );
}
