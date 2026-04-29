"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: any) => {
    const { name, value } = e.target;

    if (name === "phone") {
      const onlyNums = value.replace(/\D/g, "");
      setForm({ ...form, phone: onlyNums });
      return;
    }

    setForm({ ...form, [name]: value });
  };

  const handleSignup = async () => {
    if (
      !form.name ||
      !form.email ||
      !form.phone ||
      !form.password ||
      !form.confirmPassword
    ) {
      alert("Please fill all fields");
      return;
    }

    if (form.name.length < 3) {
      alert("Name must be at least 3 characters");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      alert("Enter a valid email address");
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(form.phone)) {
      alert("Enter valid 10-digit Indian phone number");
      return;
    }

    if (form.password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
        }),
      });

      if (res.ok) {
        alert("Account created successfully 🚀");
        router.push("/login");
      } else {
        const errorData = await res.json();
        alert(errorData.message || "Failed to create account");
      }
    } catch (error) {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] flex items-center justify-center">

      {/* MOBILE FRAME */}
      <div className="w-[390px] h-[844px] bg-[#f4f1ea] relative overflow-hidden rounded-[30px] shadow-2xl">

        {/* 🔥 ANIMATED BLUE BACKGROUND (FIXED) */}
        <div className="absolute bottom-[-120px] right-[-80px] w-[520px] h-[380px] bg-gradient-to-br from-blue-400 to-blue-600 rounded-tl-[200px] animate-[floatWave_8s_ease-in-out_infinite]" />



        {/* 🔥 HEADER */}
        <div className="absolute top-[8%] w-full text-center">
          <h1 className="text-2xl font-bold text-gray-800">GateVault</h1>
          <p className="text-xs text-gray-500">
            Secure student gate pass system
          </p>
        </div>

        {/* 🔥 TOGGLE */}
        <div className="absolute top-[16%] left-1/2 -translate-x-1/2 w-[340px] bg-gray-200 rounded-xl p-1 flex">
          <button
            onClick={() => router.push("/login")}
            className="w-1/2 py-2 text-sm text-gray-500"
          >
            Sign in
          </button>

          <button className="w-1/2 bg-white py-2 rounded-xl text-sm font-medium shadow">
            Sign up
          </button>
        </div>

        {/* 🔥 CARD */}
        <div className="absolute top-[26%] left-1/2 -translate-x-1/2 w-[340px] bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-[0_15px_50px_rgba(0,0,0,0.15)]">

          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Create Account
          </h2>

          {/* NAME */}
          <div className="mt-3">
            <p className="text-xs text-gray-400">FULL NAME</p>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              type="text"
              placeholder="John Doe"
              className="w-full mt-1 p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* EMAIL */}
          <div className="mt-3">
            <p className="text-xs text-gray-400">EMAIL</p>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              type="email"
              placeholder="yourname@gmail.com"
              className="w-full mt-1 p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* PHONE */}
          <div className="mt-3">
            <p className="text-xs text-gray-400">PHONE NUMBER</p>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              type="tel"
              maxLength={10}
              placeholder="9876543210"
              className="w-full mt-1 p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* PASSWORD */}
          <div className="mt-3 relative">
            <p className="text-xs text-gray-400">PASSWORD</p>
            <input
              name="password"
              value={form.password}
              onChange={handleChange}
              type={showPassword ? "text" : "password"}
              placeholder="********"
              className="w-full mt-1 p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-blue-400"
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 cursor-pointer text-gray-500"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </span>
          </div>

          {/* CONFIRM PASSWORD */}
          <div className="mt-3">
            <p className="text-xs text-gray-400">CONFIRM PASSWORD</p>
            <input
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              type="password"
              placeholder="********"
              className="w-full mt-1 p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* BUTTON */}
          <button
            onClick={handleSignup}
            className="w-full mt-5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 rounded-xl shadow-md hover:scale-105 active:scale-95 transition"
          >
            {loading ? "Creating..." : "SIGN UP "}
          </button>

          {/* LOGIN LINK */}
          <p className="text-xs text-gray-500 text-center mt-3">
            Already have an account?{" "}
            <span
              onClick={() => router.push("/login")}
              className="text-blue-500 font-semibold cursor-pointer hover:underline"
            >
              Sign in
            </span>
          </p>

        </div>
      </div>

      