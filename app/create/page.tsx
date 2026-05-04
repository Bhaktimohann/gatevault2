"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreatePage() {
  const router = useRouter();

  const [form, setForm] = useState({
    passType: "Short",
    phone: "",
    place: "",
    purpose: "",
    leaveStartDate: "",
    leaveEndDate: "",
    timeOut: "",
    timeIn: "",
    person: "",
    personPhone: "",
  });

  const [loading, setLoading] = useState(false);

  const parseTodayTime = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === "phone" || name === "personPhone" ? value.replace(/\D/g, "").slice(0, 10) : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🔥 VALIDATION
    if (!form.phone || form.phone.length < 10) {
      alert("Enter valid phone number");
      return;
    }

    if (!form.place || !form.purpose) {
      alert("Fill all required fields");
      return;
    }

    if (!form.timeOut || !form.timeIn) {
      alert("Select time");
      return;
    }

    const shortTimeOut = form.passType === "Short" ? parseTodayTime(form.timeOut) : null;
    const shortTimeIn = form.passType === "Short" ? parseTodayTime(form.timeIn) : null;

    if (form.passType === "LongLeave") {
      if (!form.leaveStartDate || !form.leaveEndDate) {
        alert("Select leave start and end dates");
        return;
      }

      const start = new Date(`${form.leaveStartDate}T00:00:00`);
      const end = new Date(`${form.leaveEndDate}T00:00:00`);
      const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;

      if (days < 2 || days > 15) {
        alert("Long leave must be between 2 and 15 days");
        return;
      }
    } else if (!shortTimeOut || !shortTimeIn) {
      alert("Select valid time");
      return;
    } else if (shortTimeIn <= shortTimeOut) {
      alert("Time In must be after Time Out");
      return;
    }

    const returnDateTime =
      form.passType === "LongLeave"
        ? new Date(`${form.leaveEndDate}T${form.timeIn}:00`)
        : shortTimeIn;

    if (!returnDateTime) {
      alert("Select valid time");
      return;
    }

    if (returnDateTime <= new Date()) {
      alert("Return time must be in the future");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/passes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        const passId = data.pass?._id;

        if (passId) {
          router.push(`/pass?id=${passId}`);
        } else {
          router.push("/dashboard");
        }
      } else {
        alert(data.message || "Failed to create pass");
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-shell-outer">

      {/* FRAME */}
      <div className="mobile-shell">

        {/* ORANGE BACKGROUND */}
        <div className="absolute bottom-[-100px] right-[-50px] w-[500px] h-[350px] 
        bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded-tl-[200px]" />

        {/* FORM CARD */}
        <form
          onSubmit={handleSubmit}
          className="glass-card absolute left-1/2 top-8 max-h-[calc(100%-64px)] w-[min(330px,calc(100%-32px))]
          sm:w-[min(620px,calc(100%-64px))]
          -translate-x-1/2 overflow-y-auto rounded-3xl p-5 text-gray-800 sm:p-6"
        >

          {/* TOP BLOB */}
          <div className="absolute top-0 right-0 w-16 h-14 bg-orange-400 rounded-bl-[40px]" />

          {/* TITLE */}
          <h2 className="text-lg font-semibold text-gray-800">
            Create Pass
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Fill details to generate gate pass
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1 sm:max-w-sm">
            <button
              type="button"
              onClick={() => setForm({ ...form, passType: "Short", leaveStartDate: "", leaveEndDate: "" })}
              className={`rounded-lg py-2 text-xs font-medium transition ${form.passType === "Short" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500"}`}
            >
              Short Pass
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, passType: "LongLeave" })}
              className={`rounded-lg py-2 text-xs font-medium transition ${form.passType === "LongLeave" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500"}`}
            >
              Long Leave
            </button>
          </div>

          {/* PHONE */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
            <p className="text-xs text-gray-400">PHONE</p>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="Mobile number"
              className="w-full mt-1 p-3 rounded-xl bg-white border border-gray-200 
              text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 
              focus:border-orange-300 transition"
            />
            </div>
            <div>
              <p className="text-xs text-gray-400">PLACE</p>
              <input
                name="place"
                value={form.place}
                onChange={handleChange}
                type="text"
                placeholder="Place of visit"
                className="w-full mt-1 p-3 rounded-xl bg-white border border-gray-200 
                text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 
                focus:border-orange-300 transition"
              />
            </div>
          </div>

          {/* PURPOSE */}
          <div className="mt-3">
            <p className="text-xs text-gray-400">PURPOSE</p>
            <input
              name="purpose"
              value={form.purpose}
              onChange={handleChange}
              type="text"
              maxLength={50}
              placeholder="Reason (max 50 chars)"
              className="w-full mt-1 p-3 rounded-xl bg-white border border-gray-200 
              text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 
              focus:border-orange-300 transition"
            />
          </div>

          {/* TIME PICKER */}
          {form.passType === "LongLeave" && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="min-w-0">
                <p className="text-xs text-gray-400">START DATE</p>
                <input
                  type="date"
                  name="leaveStartDate"
                  value={form.leaveStartDate}
                  onChange={handleChange}
                  className="w-full mt-1 p-3 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div className="min-w-0">
                <p className="text-xs text-gray-400">END DATE</p>
                <input
                  type="date"
                  name="leaveEndDate"
                  value={form.leaveEndDate}
                  onChange={handleChange}
                  className="w-full mt-1 p-3 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
          )}

          {/* TIME PICKER */}
          <div className="grid grid-cols-2 gap-3 mt-3 sm:grid-cols-4">

            <div className="min-w-0">
              <p className="text-xs text-gray-400">{form.passType === "LongLeave" ? "LEAVE TIME" : "TIME OUT"}</p>
              <input
                type="time"
                name="timeOut"
                value={form.timeOut}
                onChange={handleChange}
                className="w-full mt-1 p-3 rounded-xl bg-white border border-gray-200 
                text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div className="min-w-0">
              <p className="text-xs text-gray-400">{form.passType === "LongLeave" ? "RETURN TIME" : "TIME IN"}</p>
              <input
                type="time"
                name="timeIn"
                value={form.timeIn}
                onChange={handleChange}
                className="w-full mt-1 p-3 rounded-xl bg-white border border-gray-200 
                text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

          </div>

          {/* ACCOMPANYING */}
          <div className="mt-3">
            <p className="text-xs text-gray-400">ACCOMPANYING PERSON</p>
            <input
              name="person"
              value={form.person}
              onChange={handleChange}
              type="text"
              placeholder="Name"
              className="w-full mt-1 p-3 rounded-xl bg-white border border-gray-200 
              focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* PERSON PHONE */}
          <div className="mt-3">
            <p className="text-xs text-gray-400">PERSON PHONE</p>
            <input
              name="personPhone"
              value={form.personPhone}
              onChange={handleChange}
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="Mobile number"
              className="w-full mt-1 p-3 rounded-xl bg-white border border-gray-200 
              focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* BUTTONS */}
          <div className="mt-6 flex gap-3 sm:justify-end">

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="w-1/2 bg-gray-100 py-3 rounded-xl text-sm text-gray-700 sm:w-36
              hover:scale-105 active:scale-95 transition"
            >
              Back
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-1/2 bg-gradient-to-r from-orange-500 to-orange-600 sm:w-36
              text-white py-3 rounded-xl text-sm font-medium shadow-md 
              hover:scale-105 active:scale-95 transition disabled:opacity-70"
            >
              {loading ? "Creating..." : "Submit"}
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}
