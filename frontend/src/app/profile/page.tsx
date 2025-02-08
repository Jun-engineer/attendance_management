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
            <div>
                <p>Please log in again.</p>
                <Link href="/login/">Back to Login</Link>
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
                // サインアウトしてログインページにリダイレクトする
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
        <div style={{ padding: "20px" }}>
            <h1>Profile</h1>
            <p>Logged in as: {session.user?.email}</p>
            <button onClick={handleLogout}>Logout</button>
            {/* パスワード変更セクション */}
            <div style={{ marginTop: "20px" }}>
                <button onClick={() => setShowPasswordForm(!showPasswordForm)}>
                    {showPasswordForm ? "Cancel Password Change" : "Change Password"}
                </button>
                {showPasswordForm && (
                    <form onSubmit={handlePasswordChange} style={{ marginTop: "10px" }}>
                        <div>
                            <input
                                type="password"
                                placeholder="Old Password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit">Update Password</button>
                    </form>
                )}
                {passwordMsg && <p>{passwordMsg}</p>}
            </div>
            {/* アカウント削除セクション */}
            <div style={{ marginTop: "20px" }}>
                <button onClick={handleAccountDeletion} style={{ color: "red" }}>Delete Account</button>
                {deleteMsg && <p>{deleteMsg}</p>}
            </div>
            <p style={{ marginTop: "20px" }}>
                <Link href="/dashboard/">Back to Dashboard</Link>
            </p>
        </div>
    );
}
