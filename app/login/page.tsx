"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  }, []);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  }, []);

  const handleLogin = useCallback(async () => {
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      alert("Invalid credentials");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }, [email, password, router]);

  const handleGoogleLogin = useCallback(() => {
    signIn("google", { callbackUrl: "/dashboard" });
  }, []);

  const handleSignupClick = useCallback(() => {
    router.push("/signup");
  }, [router]);

  return (
    <div className="mobile-shell-outer">

      {/* MOBILE FRAME */}
      <div className="mobile-shell">

        {/* 🔥 ANIMATED BLUE BACKGROUND */}
        <div className="absolute bottom-[-120px] right-[-80px] w-[520px] h-[380px] bg-gradient-to-br from-blue-400 to-blue-600 rounded-tl-[200px] animate-[floatWave_8s_ease-in-out_infinite]" />

        {/* 🔥 HEADER */}
        <div className="absolute top-[8%] w-full text-center">
          <h1 className="text-2xl font-bold text-gray-800">GateVault</h1>
          <p className="text-xs text-gray-500">
            Secure student gate pass system
          </p>
        </div>

        {/* 🔥 TOGGLE BUTTON */}
        <div className="absolute top-[16%] left-1/2 w-[min(340px,calc(100%-32px))] -translate-x-1/2 rounded-xl bg-gray-200 p-1 flex">
          <button className="w-1/2 bg-white py-2 rounded-xl text-sm font-medium shadow">
            Sign in
          </button>
          <button
            onClick={handleSignupClick}
            className="w-1/2 py-2 text-sm text-gray-500"
          >
            Sign up
          </button>
        </div>

        {/* 🔥 LOGIN CARD */}
        <div className="glass-card absolute top-[26%] left-1/2 w-[min(340px,calc(100%-32px))] -translate-x-1/2 rounded-3xl p-6 text-gray-800">

          {/* 🔥 GOOGLE LOGIN */}
          <button
            onClick={handleGoogleLogin}
            className="w-full border border-gray-300 rounded-full py-3 px-3 flex items-center justify-center gap-2 hover:bg-gray-50 transition"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              className="h-5"
            />
            <span className="text-sm font-medium text-gray-800">
              Sign in with Google
            </span>
          </button>

          {/* DIVIDER */}
          <div className="flex items-center gap-2 mb-4 mt-4">
            <div className="flex-1 h-[1px] bg-gray-300"></div>
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-[1px] bg-gray-300"></div>
          </div>

          {/* EMAIL */}
          <input
            type="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="Email"
            className="w-full p-3 rounded-xl bg-gray-100 mb-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          {/* PASSWORD */}
          <input
            type="password"
            value={password}
            onChange={handlePasswordChange}
            placeholder="Password"
            className="w-full p-3 rounded-xl bg-gray-100 mb-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          {/* REMEMBER + FORGOT */}
          <div className="flex justify-between items-center mb-4 text-xs text-gray-600">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked />
              Remember me
            </label>

            <span className="text-gray-500 cursor-pointer">
              Forgot password?
            </span>
          </div>

          {/* 🔥 SIGN IN BUTTON */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className={`w-full bg-blue-500 text-white py-3 rounded-full mb-3 text-sm font-medium shadow-md transition ${loading ? "opacity-70 cursor-not-allowed" : "hover:bg-blue-600"}`}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          {/* TERMS */}
          <p className="text-[10px] text-gray-400 text-center mb-4">
            By signing in you agree to terms & privacy policy
          </p>

          {/* CREATE ACCOUNT */}
          <button
            onClick={handleSignupClick}
            className="w-full bg-gradient-to-r from-purple-400 to-purple-500 text-white py-3 rounded-full text-sm font-medium"
          >
            Create a new account
          </button>

        </div>
      </div>
    </div>
  );
}
