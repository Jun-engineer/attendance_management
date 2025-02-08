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
        // エラーレスポンスの内容を取得
        const errorData = await res.json();
        setMessage(errorData.error || "Registration failed");
      } else {
        setMessage("登録成功！ログインページに移動します...");
        // 成功したら1.5秒後にログインページへリダイレクト
        setTimeout(() => {
          router.push("/login/");
        }, 1500);
      }
    } catch (error) {
      console.error("Registration error:", error);
      setMessage("登録に失敗しました");
    }
  };

  return (
    <div className="container" style={{ padding: "20px" }}>
      <div className="content">
        <h1>Attendance Management System</h1>
        <h2>ユーザー登録</h2>
        <form onSubmit={handleRegister}>
          <div>
            <input
              type="text"
              id="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div style={{ marginTop: "10px" }}>
            <input
              type="password"
              id="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div style={{ marginTop: "10px" }}>
            <button type="submit" id="registerButton">Register</button>
          </div>
        </form>
        {message && <p style={{ marginTop: "10px" }}>{message}</p>}
        <p style={{ marginTop: "20px" }}>You already have an account? <Link href="/login/">Login here</Link></p>
        <p><Link href="/">Back to Top</Link></p>
      </div>
    </div>
  );
}
