"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ProfilePage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [passwordMsg, setPasswordMsg] = useState("");
    const [deleteMsg, setDeleteMsg] = useState("");

    if (!session) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
                <p className="mb-4 text-lg">Please log in again.</p>
                <Link href="/login/" className="text-blue-500 underline">
                    Back to Login
                </Link>
            </div>
        );
    }

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMsg("");

        try {
            const res = await fetch("/api/user/password/", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ oldPassword, newPassword }),
                credentials: "include",
            });
            if (!res.ok) {
                const data = await res.json();
                setPasswordMsg(data.error || "Password update failed");
            } else {
                setPasswordMsg("Password updated successfully");
                setOldPassword("");
                setNewPassword("");
                setShowPasswordForm(false);
            }
        } catch (error) {
            console.error("Password change error:", error);
            setPasswordMsg("An error occurred");
        }
    };

    const handleAccountDeletion = async () => {
        const confirmed = confirm("Are you sure you want to delete your account? This action cannot be undone.");
        if (!confirmed) return;
        setDeleteMsg("");
        try {
            const res = await fetch("/api/user/", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            });
            if (!res.ok) {
                const data = await res.json();
                setDeleteMsg(data.error || "Account deletion failed");
            } else {
                setDeleteMsg("Account deleted successfully");
                signOut({ callbackUrl: "/login/" });
            }
        } catch (error) {
            console.error("Account deletion error:", error);
            setDeleteMsg("An error occurred");
        }
    };

    const handleLogout = () => {
        signOut({ callbackUrl: "/login/" });
    };

    return (
        <div className="min-h-screen bg-gradient-to-r from-purple-900 to-blue-900 text-white flex items-center justify-center p-4">
          <div className="max-w-3xl w-full bg-black bg-opacity-50 rounded-lg shadow-xl p-8">
            <h1 className="text-3xl font-bold mb-4 text-center">Profile</h1>
            <p className="mb-4 text-center">Logged in as: {session.user?.email}</p>
    
            {/* Change password section */}
            <div className="mb-6 text-center">
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                {showPasswordForm ? "Cancel Password Change" : "Change Password"}
              </button>
              {showPasswordForm && (
                <form onSubmit={handlePasswordChange} className="mt-4 space-y-4">
                  <div>
                    <input
                      type="password"
                      placeholder="Old Password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                      className="w-full p-2 rounded-md text-black"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full p-2 rounded-md text-black"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md"
                  >
                    Update Password
                  </button>
                </form>
              )}
              {passwordMsg && <p className="mt-2">{passwordMsg}</p>}
            </div>
    
            {/* Delete account section */}
            <div className="mb-6 text-center">
              <button
                onClick={handleAccountDeletion}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md"
              >
                Delete Account
              </button>
              {deleteMsg && <p className="mt-2">{deleteMsg}</p>}
            </div>
    
            {/* Logout button placed under delete account with extra top margin */}
            <div className="flex justify-center mt-10 mb-6">
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md"
              >
                Logout
              </button>
            </div>
            <p className="text-center">
              <Link href="/dashboard/" className="text-blue-500 underline">
                Back to Dashboard
              </Link>
            </p>
          </div>
        </div>
    );
}
