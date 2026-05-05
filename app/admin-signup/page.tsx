"use client";

import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, useState } from "react";

export default function AdminSignupPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    verificationCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name === "phone" ? value.replace(/\D/g, "") : value });
  };

  const handleSignup = async () => {
    if (!form.name || !form.email || !form.phone || !form.password || !form.confirmPassword || !form.verificationCode) {
      alert("Please fill all fields");
      return;
    }

    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/admin-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          verificationCode: form.verificationCode,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to create admin account");
        return;
      }

      alert("Admin account created successfully");
      router.push("/login");
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
            <button type="button" onClick={() => router.push("/login")}>
              Sign in
            </button>
            <button type="button" className="auth-toggle-active">
              Sign up
            </button>
          </div>

          <div className="auth-role-switcher" aria-label="Staff signup role">
            <button type="button" className="auth-role-active">
              Admin
            </button>
            <button type="button" onClick={() => router.push("/hod-signup")}>
              HOD
            </button>
            <button type="button" onClick={() => router.push("/warden-signup")}>
              Warden
            </button>
            <button type="button" onClick={() => router.push("/security-signup")}>
              Security
            </button>
          </div>

          <div className="glass-card auth-card">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <ShieldCheck size={22} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase text-blue-600">Admin Signup</p>
                <h2 className="text-lg font-semibold text-gray-800">Create Admin Account</h2>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-400">FULL NAME</p>
              <input name="name" value={form.name} onChange={handleChange} type="text" placeholder="Admin name" autoComplete="name" className="mt-1 w-full rounded-xl bg-gray-100 p-3 text-gray-800 outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-400">EMAIL</p>
              <input name="email" value={form.email} onChange={handleChange} type="email" placeholder="admin@gmail.com" autoComplete="email" className="mt-1 w-full rounded-xl bg-gray-100 p-3 text-gray-800 outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-400">PHONE NUMBER</p>
              <input name="phone" value={form.phone} onChange={handleChange} type="tel" inputMode="numeric" maxLength={10} placeholder="9876543210" autoComplete="tel" className="mt-1 w-full rounded-xl bg-gray-100 p-3 text-gray-800 outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            <div className="relative mt-3">
              <p className="text-xs text-gray-400">PASSWORD</p>
              <input name="password" value={form.password} onChange={handleChange} type={showPassword ? "text" : "password"} placeholder="********" autoComplete="new-password" className="mt-1 w-full rounded-xl bg-gray-100 p-3 pr-11 text-gray-800 outline-none focus:ring-2 focus:ring-blue-400" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-8 rounded-md p-1 text-gray-500" aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-400">CONFIRM PASSWORD</p>
              <input name="confirmPassword" value={form.confirmPassword} onChange={handleChange} type="password" placeholder="********" autoComplete="new-password" className="mt-1 w-full rounded-xl bg-gray-100 p-3 text-gray-800 outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-400">VERIFICATION CODE</p>
              <input name="verificationCode" value={form.verificationCode} onChange={handleChange} type="password" placeholder="Staff code" autoComplete="off" className="mt-1 w-full rounded-xl bg-gray-100 p-3 text-gray-800 outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            <button type="button" onClick={handleSignup} disabled={loading} className={`mt-5 w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 py-3 font-semibold text-white shadow-md transition ${loading ? "cursor-not-allowed opacity-70" : "hover:scale-[1.02] active:scale-[0.98]"}`}>
              {loading ? "Creating..." : "CREATE ADMIN"}
            </button>

            <p className="mt-3 text-center text-xs text-gray-500">
              Already have an account?{" "}
              <button type="button" onClick={() => router.push("/login")} className="font-semibold text-blue-500 hover:underline">
                Sign in
              </button>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
