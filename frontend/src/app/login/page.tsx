"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  // JWT認証用フォームの状態管理
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // すでにセッションがあれば、ダッシュボードへリダイレクト
  useEffect(() => {
    if (session) {
      // セッションが存在する場合は、レンダリング完了後にリダイレクトする
      router.push("/dashboard");
    }
  }, [session, router]);

  // Credentials（JWT認証）でログインする処理
  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // next-auth の Credentials プロバイダーを利用してログイン
    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl: "/dashboard", // ログイン成功後のリダイレクト先
    });

    if (result?.error) {
      setErrorMsg("ログインに失敗しました: " + result.error);
    } else if (result?.ok) {
      router.push("/dashboard");
    }
  };

  // OAuth（Google）でログインする処理
  const handleGoogleLogin = async () => {
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="container" style={{ padding: "20px" }}>
      <h1>Attendance Management System - Login</h1>
      
      {/* Credentials (JWT) ログインフォーム */}
      <form onSubmit={handleCredentialsLogin} style={{ marginBottom: "20px" }}>
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="メールアドレス"
            required
          />
        </div>
        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード"
            required
          />
        </div>
        <button type="submit">メール/パスワードでログイン</button>
        {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
      </form>

      {/* OAuth (Google) ログインボタン */}
      <button onClick={handleGoogleLogin}>Googleでログイン</button>
      
      <p>
        アカウントをお持ちでない方は <Link href="/register">こちら</Link> から登録してください。
      </p>
    </div>
  );
}
