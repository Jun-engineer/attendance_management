"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // If the user is already logged in, redirect to the dashboard page.
  useEffect(() => {
    if (session) {
      router.push("/dashboard/");
    }
  }, [session, router]);

  // login with credentials (email/password)
  const handleCredentialsLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");

    const result = await signIn("credentials", {
      redirect: false,
      email: email,
      password: password,
      callbackUrl: "/dashboard/",
    });

    if (result && result.error) {
      setErrorMsg("Failed to log in: " + result.error);
    } else if (result?.url) {
      router.push(result.url);
    }
  };

  // Login with OAuth providers
  const handleGoogleLogin = async () => {
    await signIn("google", { callbackUrl: "/dashboard/" });
  };

  const handleGitHubLogin = async () => {
    await signIn("github", { callbackUrl: "/dashboard/" });
  };

  return (
    <div className="container" style={{ padding: "20px" }}>
      <h1>Attendance Management System - Login</h1>
      
      {/* Login form with credentials (email/password) */}
      <form onSubmit={handleCredentialsLogin} style={{ marginBottom: "20px" }}>
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            required
          />
        </div>
        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            required
          />
        </div>
        <button type="submit">Login with email/password</button>
        {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
      </form>

      {/* Login botton with oauth */}
      <button onClick={handleGoogleLogin}>Login with Google</button>
      <button onClick={handleGitHubLogin}>Login with Github</button>
      
      <p>
        You do not have an account? Please register your account <Link href="/register/">here</Link>.
      </p>
    </div>
  );
}
