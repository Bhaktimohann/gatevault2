"use client";

import { useEffect, useState, useCallback } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { Card } from "@/components/Card";
import { BottomNav } from "@/components/BottomNav";
import { PageSkeleton } from "@/components/LoadingSkeleton";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function SettingsPage() {
  const { isReady, status } = useAuthGuard();

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [oldPhone, setOldPhone] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const loadCurrentPhone = async () => {
      try {
        const res = await fetch(`/api/user?ts=${Date.now()}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (res.ok && data.user?.phone) {
          setOldPhone(data.user.phone);
        }
      } catch {
        setMessage("Could not load your current phone number");
      }
    };

    loadCurrentPhone();
  }, [isReady]);

  const handlePasswordChange = useCallback(async () => {
    if (!oldPass || !newPass || !confirmPass) {
      setMessage("Please fill all password fields");
      return;
    }
    if (newPass !== confirmPass) {
      setMessage("Passwords do not match");
      return;
    }
    if (newPass.length < 6) {
      setMessage("Password must be at least 6 characters");
      return;
    }

    setSavingPassword(true);
    setMessage("");

    try {
      const res = await fetch("/api/user/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          oldPassword: oldPass,
          newPassword: newPass,
          confirmPassword: confirmPass,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to change password");
        return;
      }

      setOldPass("");
      setNewPass("");
      setConfirmPass("");
      setMessage(data.message || "Password changed successfully");
    } catch {
      setMessage("Something went wrong");
    } finally {
      setSavingPassword(false);
    }
  }, [oldPass, newPass, confirmPass]);

  const handlePhoneChange = useCallback(async () => {
    if (!oldPhone || !newPhone) {
      setMessage("Please fill both phone fields");
      return;
    }
    if (oldPhone.length !== 10 || newPhone.length !== 10) {
      setMessage("Phone number must be 10 digits");
      return;
    }
    if (oldPhone === newPhone) {
      setMessage("New phone must be different");
      return;
    }

    setSavingPhone(true);
    setMessage("");

    try {
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          oldPhone,
          newPhone,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to update phone");
        return;
      }

      setOldPhone(data.user?.phone || newPhone);
      setNewPhone("");
      setMessage(data.message || "Phone updated successfully");
    } catch {
      setMessage("Something went wrong");
    } finally {
      setSavingPhone(false);
    }
  }, [oldPhone, newPhone]);

  const handleOldPassChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setOldPass(e.target.value), []);
  const handleNewPassChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setNewPass(e.target.value), []);
  const handleConfirmPassChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setConfirmPass(e.target.value), []);
  const handleOldPhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setOldPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
  }, []);
  const handleNewPhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
  }, []);

  if (!isReady || status === "loading") {
    return <PageSkeleton />;
  }

  return (
    <MobileLayout>
      <div className="absolute left-1/2 top-8 max-h-[calc(100%-112px)] w-[min(320px,calc(100%-32px))] -translate-x-1/2 overflow-y-auto sm:w-[min(560px,calc(100%-64px))]">
        <Card>
          <h2 className="text-lg font-semibold text-gray-800 mt-2">Settings</h2>

          {message && (
            <div className={`mt-4 rounded-xl px-3 py-2 text-center text-xs ${message.includes("successfully") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
              {message}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-3 mb-3">Change your password</p>

          <input
            type="password"
            placeholder="Old Password"
            value={oldPass}
            onChange={handleOldPassChange}
            className="w-full mb-3 p-3 rounded-xl bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />

          <input
            type="password"
            placeholder="New Password"
            value={newPass}
            onChange={handleNewPassChange}
            className="w-full mb-3 p-3 rounded-xl bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPass}
            onChange={handleConfirmPassChange}
            className="w-full p-3 rounded-xl bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />

          <button
            onClick={handlePasswordChange}
            disabled={savingPassword}
            className="w-full mt-4 bg-gradient-to-r from-orange-400 to-orange-600 text-white py-3 rounded-xl font-medium shadow-md hover:scale-105 active:scale-95 transition disabled:opacity-70"
          >
            {savingPassword ? "Changing..." : "Change Password"}
          </button>

          <p className="text-xs text-gray-500 mt-6 mb-3">Change phone number</p>

          <input
            type="text"
            placeholder="Old Phone Number"
            value={oldPhone}
            onChange={handleOldPhoneChange}
            inputMode="numeric"
            maxLength={10}
            className="w-full mb-3 p-3 rounded-xl bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />

          <input
            type="text"
            placeholder="New Phone Number"
            value={newPhone}
            onChange={handleNewPhoneChange}
            inputMode="numeric"
            maxLength={10}
            className="w-full p-3 rounded-xl bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />

          <button
            onClick={handlePhoneChange}
            disabled={savingPhone}
            className="w-full mt-4 bg-gradient-to-r from-orange-400 to-orange-600 text-white py-3 rounded-xl font-medium shadow-md hover:scale-105 active:scale-95 transition disabled:opacity-70"
          >
            {savingPhone ? "Updating..." : "Update Phone"}
          </button>
        </Card>
      </div>

      <BottomNav activeTab="settings" />
    </MobileLayout>
  );
}
