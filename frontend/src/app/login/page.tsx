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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-900 to-blue-900 text-white p-6">
      <div className="w-full max-w-md bg-black bg-opacity-50 rounded-lg shadow-xl p-8">
        <h1 className="text-center text-2xl font-bold mb-6">Login</h1>
        <form onSubmit={handleCredentialsLogin} className="space-y-4 mb-6">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full p-3 rounded-md text-black"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full p-3 rounded-md text-black"
          />
          <button
            type="submit"
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-md transition"
          >
            Login with Email/Password
          </button>
          {errorMsg && <p className="text-center text-red-400">{errorMsg}</p>}
        </form>
        <div className="flex flex-col space-y-4 mt-10 mb-6">
          <button
            onClick={handleGoogleLogin}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 rounded-md transition flex items-center justify-center"
          >
            {/* Official Google mark */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 mr-2"
              viewBox="0 0 48 48"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.96 0 6.9 1.46 9.01 2.7l6.63-6.63C34.48 3.63 29.82 1 24 1 14.36 1 5.73 6.79 2.22 15.14l7.7 6 4.03-5.54C13.08 9.95 18.1 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.05 24.55c0-1.57-.14-3.09-.42-4.55H24v8.64h12.56c-.55 2.99-2.17 5.53-4.63 7.21l7.26 5.65C43.06 36.4 46.05 31.45 46.05 24.55z"
              />
              <path
                fill="#FBBC05"
                d="M9.92 28.82a14.55 14.55 0 0 1 0-9.64l-7.7-6A23.958 23.958 0 0 0 0 24c0 3.87.93 7.51 2.62 10.82l7.3-6z"
              />
              <path
                fill="#34A853"
                d="M24 47c6.48 0 11.93-2.14 15.91-5.82l-7.26-5.65c-2.02 1.36-4.63 2.16-8.65 2.16-6.06 0-11.21-4.09-13.07-9.59l-7.3 6.04A23.958 23.958 0 0 0 24 47z"
              />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
            Login with Google
          </button>
          <button
            onClick={handleGitHubLogin}
            className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-md transition flex items-center justify-center"
          >
            {/* Official GitHub mark */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 mr-2"
              viewBox="0 0 16 16"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.33-.27 2.02-.27.69 0 1.38.09 2.02.27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Login with Github
          </button>
        </div>
        <p className="text-center">
          You do not have an account?
          <br />
          Please register your account{" "}
          <Link href="/register/">
            <span className="text-blue-400 underline">here</span>
          </Link>.
        </p>
      </div>
    </div>
  );
}
