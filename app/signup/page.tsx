"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    universityId: "",
    semester: "",
    department: "",
    branch: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
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
      !form.universityId ||
      !form.semester ||
      !form.department ||
      !form.branch ||
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

    if (form.universityId.trim().length > 40) {
      alert("University ID is too long");
      return;
    }

    if (form.semester.trim().length > 20) {
      alert("Semester is too long");
      return;
    }

    if (form.department.trim().length > 80) {
      alert("Department is too long");
      return;
    }

    if (form.branch.trim().length > 80) {
      alert("Branch is too long");
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
          universityId: form.universityId,
          semester: form.semester,
          department: form.department,
          branch: form.branch,
          password: form.password,
        }),
      });

      if (res.ok) {
        alert("Account created successfully");
        router.push("/login");
      } else {
        const errorData = await res.json();
        alert(errorData.message || "Failed to create account");
      }
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

          <div className="glass-card auth-card">
            <h2 className="mb-2 text-lg font-semibold text-gray-800">
              Create Account
            </h2>

            <div className="mt-3">
              <p className="text-xs text-gray-400">FULL NAME</p>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                type="text"
                placeholder="John Doe"
                autoComplete="name"
                className="mt-1 w-full rounded-xl bg-gray-100 p-3 text-gray-800 outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-400">EMAIL</p>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                type="email"
                placeholder="yourname@gmail.com"
                autoComplete="email"
                className="mt-1 w-full rounded-xl bg-gray-100 p-3 text-gray-800 outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-400">PHONE NUMBER</p>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="9876543210"
                autoComplete="tel"
                className="mt-1 w-full rounded-xl bg-gray-100 p-3 text-gray-800 outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-400">UNIVERSITY ID</p>
              <input
                name="universityId"
                value={form.universityId}
                onChange={handleChange}
                type="text"
                placeholder="KU123456"
                autoComplete="off"
                className="mt-1 w-full rounded-xl bg-gray-100 p-3 text-gray-800 outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="mt-3">
                <p className="text-xs text-gray-400">SEMESTER</p>
                <input
                  name="semester"
                  value={form.semester}
                  onChange={handleChange}
                  type="text"
                  placeholder="5th"
                  className="mt-1 w-full rounded-xl bg-gray-100 p-3 text-gray-800 outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div className="mt-3">
                <p className="text-xs text-gray-400">DEPARTMENT</p>
                <input
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  type="text"
                  placeholder="Engineering"
                  className="mt-1 w-full rounded-xl bg-gray-100 p-3 text-gray-800 outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-400">BRANCH</p>
              <input
                name="branch"
                value={form.branch}
                onChange={handleChange}
                type="text"
                placeholder="Computer Science"
                className="mt-1 w-full rounded-xl bg-gray-100 p-3 text-gray-800 outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="relative mt-3">
              <p className="text-xs text-gray-400">PASSWORD</p>
              <input
                name="password"
                value={form.password}
                onChange={handleChange}
                type={showPassword ? "text" : "password"}
                placeholder="********"
                autoComplete="new-password"
                className="mt-1 w-full rounded-xl bg-gray-100 p-3 pr-11 text-gray-800 outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 rounded-md p-1 text-gray-500"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-400">CONFIRM PASSWORD</p>
              <input
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                type="password"
                placeholder="********"
                autoComplete="new-password"
                className="mt-1 w-full rounded-xl bg-gray-100 p-3 text-gray-800 outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <button
              type="button"
              onClick={handleSignup}
              disabled={loading}
              className={`mt-5 w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 py-3 font-semibold text-white shadow-md transition ${loading ? "cursor-not-allowed opacity-70" : "hover:scale-[1.02] active:scale-[0.98]"}`}
            >
              {loading ? "Creating..." : "SIGN UP"}
            </button>

            <p className="mt-3 text-center text-xs text-gray-500">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="font-semibold text-blue-500 hover:underline"
              >
                Sign in
              </button>
            </p>

            <div className="mt-5 border-t border-gray-200 pt-4">
              <p className="mb-2 text-center text-xs font-semibold uppercase text-gray-400">
                Staff signup
              </p>
              <div className="auth-role-switcher mt-0">
                <button type="button" onClick={() => router.push("/admin-signup")}>
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
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
