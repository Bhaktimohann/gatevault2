"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreatePage() {
  const router = useRouter();

  const [form, setForm] = useState({
    phone: "",
    place: "",
    purpose: "",
    timeOut: "",
    timeIn: "",
    person: "",
    personPhone: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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

    if (form.timeIn <= form.timeOut) {
      alert("Time In must be after Time Out");
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

      if (res.ok) {
        router.push("/dashboard");
      } else {
        const errorData = await res.json();
        alert(errorData.message || "Failed to create pass");
      }
    } catch (error) {
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
          className="glass-card absolute top-[8%] left-1/2 w-[min(330px,calc(100%-32px))]
          -translate-x-1/2 rounded-3xl p-6 text-gray-800"
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

          {/* PHONE */}
          <div className="mt-3">
            <p className="text-xs text-gray-400">PHONE</p>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              type="tel"
              placeholder="Mobile number"
              className="w-full mt-1 p-3 rounded-xl bg-white border border-gray-200 
              text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 
              focus:border-orange-300 transition"
            />
          </div>

          {/* PLACE */}
          <div className="mt-3">
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
          <div className="flex gap-3 mt-3">

            <div className="w-1/2">
              <p className="text-xs text-gray-400">TIME OUT</p>
              <input
                type="time"
                name="timeOut"
                value={form.timeOut}
                onChange={handleChange}
                className="w-full mt-1 p-3 rounded-xl bg-white border border-gray-200 
                text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div className="w-1/2">
              <p className="text-xs text-gray-400">TIME IN</p>
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
              placeholder="Mobile number"
              className="w-full mt-1 p-3 rounded-xl bg-white border border-gray-200 
              focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* BUTTONS */}
          <div className="mt-6 flex gap-3">

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="w-1/2 bg-gray-100 py-3 rounded-xl text-sm text-gray-700
              hover:scale-105 active:scale-95 transition"
            >
              Back
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-1/2 bg-gradient-to-r from-orange-500 to-orange-600 
              text-white py-3 rounded-xl text-sm font-medium shadow-md 
              hover:scale-105 active:scale-95 transition disabled:opacity-70"
            >
              {loading ? "Creating..." : "Submit →"}
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}
