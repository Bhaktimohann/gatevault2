"use client";

import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";

type UserRole = "admin" | "hod" | "warden" | "security" | "student";

type SessionUserWithRole = {
  role?: UserRole;
};

function getDashboardPath(role?: UserRole) {
  if (role === "admin") return "/admin";
  if (role === "hod") return "/hod";
  if (role === "warden") return "/warden";
  if (role === "security") return "/security";

  return "/dashboard";
}

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
      return;
    }

    let session = await getSession();

    for (let attempt = 0; attempt < 5 && !session?.user; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      session = await getSession();
    }

    const role = (session?.user as SessionUserWithRole | undefined)?.role;
    router.push(getDashboardPath(role));
  }, [email, password, router]);

  const handleGoogleLogin = useCallback(() => {
    signIn("google", { callbackUrl: "/dashboard" });
  }, []);

  const handleSignupClick = useCallback(() => {
    router.push("/signup");
  }, [router]);

  return (
    <main className="auth-shell-outer">
      <section className="auth-shell">
        <div className="auth-bg-wave" />

        <div className="auth-content">
          <header className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">GateVault</h1>
            <p className="mt-1 text-xs text-gray-500 sm:text-sm">
              Secure student gate pass system
            </p>
          </header>

          <div className="auth-toggle">
            <button type="button" className="auth-toggle-active">
              Sign in
            </button>
            <button type="button" onClick={handleSignupClick}>
              Sign up
            </button>
          </div>

          <div className="glass-card auth-card">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 px-3 py-3 transition hover:bg-gray-50"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5 shrink-0"
              >
                <path
                  fill="#4285F4"
                  d="M21.6 12.23c0-.72-.06-1.25-.19-1.8H12v3.27h5.52c-.11.81-.71 2.03-2.04 2.85l-.02.11 2.96 2.02.2.02c1.86-1.52 2.98-3.76 2.98-6.47Z"
                />
                <path
                  fill="#34A853"
                  d="M12 21c2.66 0 4.89-.77 6.52-2.1l-3.1-2.35c-.83.51-1.94.87-3.42.87-2.6 0-4.8-1.52-5.59-3.63l-.12.01-3.08 2.11-.04.1C4.78 18.94 8.12 21 12 21Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.41 13.79A5.15 5.15 0 0 1 6.12 12c0-.62.1-1.22.28-1.79l-.01-.12-3.12-2.15-.1.04A8.33 8.33 0 0 0 2.3 12c0 1.45.39 2.81 1.07 4.02l3.04-2.23Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 6.58c1.85 0 3.1.7 3.81 1.29l2.78-2.4C16.88 4.06 14.66 3 12 3 8.12 3 4.78 5.06 3.17 7.98l3.23 2.23C7.2 8.1 9.4 6.58 12 6.58Z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-800">
                Sign in with Google
              </span>
            </button>

            <div className="my-4 flex items-center gap-2">
              <div className="h-[1px] flex-1 bg-gray-300" />
              <span className="text-xs text-gray-400">or</span>
              <div className="h-[1px] flex-1 bg-gray-300" />
            </div>

            <input
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="Email"
              autoComplete="email"
              className="mb-3 w-full rounded-xl bg-gray-100 p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <input
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="Password"
              autoComplete="current-password"
              className="mb-3 w-full rounded-xl bg-gray-100 p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                Remember me
              </label>

              <button type="button" className="text-gray-500 transition hover:text-blue-600">
                Forgot password?
              </button>
            </div>

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className={`mb-3 w-full rounded-full bg-blue-500 py-3 text-sm font-medium text-white shadow-md transition ${loading ? "cursor-not-allowed opacity-70" : "hover:bg-blue-600"}`}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <p className="mb-4 text-center text-[10px] text-gray-400">
              By signing in you agree to terms & privacy policy
            </p>

            <button
              type="button"
              onClick={handleSignupClick}
              className="w-full rounded-full bg-gradient-to-r from-purple-400 to-purple-500 py-3 text-sm font-medium text-white"
            >
              Create a new account
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
