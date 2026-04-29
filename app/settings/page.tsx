"use client";

import { useState, useCallback } from "react";
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

  const handlePasswordChange = useCallback(() => {
    if (!oldPass || !newPass || !confirmPass) {
      alert("Please fill all fields");
      return;
    }
    if (newPass !== confirmPass) {
      alert("Passwords do not match");
      return;
    }
    if (newPass.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
    alert("Password changed successfully (demo)");
  }, [oldPass, newPass, confirmPass]);

  const handlePhoneChange = useCallback(() => {
    if (!oldPhone || !newPhone) {
      alert("Please fill both phone fields");
      return;
    }
    if (oldPhone.length !== 10 || newPhone.length !== 10) {
      alert("Phone number must be 10 digits");
      return;
    }
    if (oldPhone === newPhone) {
      alert("New phone must be different");
      return;
    }
    alert("Phone updated successfully (demo)");
  }, [oldPhone, newPhone]);

  const handleOldPassChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setOldPass(e.target.value), []);
  const handleNewPassChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setNewPass(e.target.value), []);
  const handleConfirmPassChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setConfirmPass(e.target.value), []);
  const handleOldPhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setOldPhone(e.target.value), []);
  const handleNewPhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setNewPhone(e.target.value), []);

  if (!isReady || status === "loading") {
    return <PageSkeleton />;
  }

  return (
    <MobileLayout>
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[320px]">
        <Card>
          <h2 className="text-lg font-semibold text-gray-800 mt-2">Settings</h2>

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
            className="w-full mt-4 bg-gradient-to-r from-orange-400 to-orange-600 text-white py-3 rounded-xl font-medium shadow-md hover:scale-105 active:scale-95 transition"
          >
            Change Password
          </button>

          <p className="text-xs text-gray-500 mt-6 mb-3">Change phone number</p>

          <input
            type="text"
            placeholder="Old Phone Number"
            value={oldPhone}
            onChange={handleOldPhoneChange}
            className="w-full mb-3 p-3 rounded-xl bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />

          <input
            type="text"
            placeholder="New Phone Number"
            value={newPhone}
            onChange={handleNewPhoneChange}
            className="w-full p-3 rounded-xl bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />

          <button
            onClick={handlePhoneChange}
            className="w-full mt-4 bg-gradient-to-r from-orange-400 to-orange-600 text-white py-3 rounded-xl font-medium shadow-md hover:scale-105 active:scale-95 transition"
          >
            Update Phone
          </button>
        </Card>
      </div>

      <BottomNav activeTab="settings" />
    </MobileLayout>
  );
}