"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import {
  Building2,
  Edit,
  Hash,
  Home,
  IdCard,
  LogOut,
  Phone,
  Save,
  School,
  Settings,
  User,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

type ProfileFieldProps = {
  icon: ReactNode;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
};

function avatarSrc(src: string, version: number) {
  if (!src || src === "/set2.png") {
    return "/set2.png";
  }

  return `${src}${src.includes("?") ? "&" : "?"}v=${version}`;
}

function ProfileField({ icon, label, value, placeholder, onChange, inputMode, maxLength }: ProfileFieldProps) {
  return (
    <label className="block rounded-2xl bg-white/75 px-3 py-3 shadow-sm ring-1 ring-gray-100">
      <span className="flex items-center gap-2 text-[10px] font-semibold uppercase text-gray-500">
        <span className="text-orange-500">{icon}</span>
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        className="mt-1 w-full bg-transparent text-sm font-semibold text-gray-800 outline-none placeholder:text-gray-300"
      />
    </label>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [user, setUser] = useState({
    name: "",
    email: "",
    phone: "",
    universityId: "",
    semester: "",
    department: "",
    branch: "",
    section: "",
    hostel: "",
    room: "",
    image: "/set2.png",
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && session?.user) {
      const sessionUser = session.user;

      const loadUser = async () => {
        try {
          const res = await fetch(`/api/user?ts=${Date.now()}`, {
            cache: "no-store",
          });
          const data = await res.json();

          if (res.ok && data.user) {
            setUser({
              name: data.user.name || sessionUser.name || "",
              email: data.user.email || sessionUser.email || "",
              phone: data.user.phone || "",
              universityId: data.user.universityId || "",
              semester: data.user.semester || "",
              department: data.user.department || "",
              branch: data.user.branch || "",
              section: data.user.section || "",
              hostel: data.user.hostel || "",
              room: data.user.room || "",
              image: data.user.avatar || "/set2.png",
            });
          } else {
            setUser((current) => ({
              ...current,
              name: sessionUser.name || "",
              email: sessionUser.email || "",
            }));
          }
        } catch {
          setUser((current) => ({
            ...current,
            name: sessionUser.name || "",
            email: sessionUser.email || "",
          }));
        } finally {
          setLoadingProfile(false);
        }
      };

      loadUser();
    }
  }, [status, session, router]);

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 150 * 1024) {
      alert("Image too large! Max 150KB allowed.");
      return;
    }

    setUploadingAvatar(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/user", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to update profile photo");
        return;
      }

      setUser((current) => ({
        ...current,
        image: data.user.avatar || current.image,
      }));
      setAvatarVersion(Date.now());
      e.target.value = "";
      setMessage(data.message || "Profile photo updated successfully");
    } catch {
      setMessage("Something went wrong");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleFieldChange = (
    field: "phone" | "universityId" | "semester" | "department" | "branch" | "section" | "hostel" | "room",
    value: string
  ) => {
    setUser((current) => ({
      ...current,
      [field]: field === "phone" ? value.replace(/\D/g, "").slice(0, 10) : value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: user.phone,
          universityId: user.universityId,
          semester: user.semester,
          department: user.department,
          branch: user.branch,
          section: user.section,
          hostel: user.hostel,
          room: user.room,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to update profile");
        return;
      }

      setUser((current) => ({
        ...current,
        phone: data.user.phone || "",
        universityId: data.user.universityId || "",
        semester: data.user.semester || "",
        department: data.user.department || "",
        branch: data.user.branch || "",
        section: data.user.section || "",
        hostel: data.user.hostel || "",
        room: data.user.room || "",
      }));
      setMessage(data.message || "Profile updated successfully");
    } catch {
      setMessage("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loadingProfile) {
    return (
      <div className="mobile-shell-outer">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mobile-shell-outer">
      <div className="mobile-shell">
        <div className="absolute bottom-[-100px] right-[-50px] h-[350px] w-[500px] rounded-tl-[200px] bg-gradient-to-r from-orange-400 to-orange-600" />

        <main className="glass-card absolute left-1/2 top-6 max-h-[calc(100%-104px)] w-[min(340px,calc(100%-32px))] -translate-x-1/2 overflow-y-auto rounded-3xl p-4 text-gray-800 animate-[slideUp_0.6s_ease] sm:w-[min(680px,calc(100%-64px))] sm:p-5">
          <div className="absolute right-0 top-0 h-16 w-20 rounded-bl-[44px] bg-orange-400" />

          <section className="relative">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">Student Profile</p>

            <div className="mt-4 flex items-center gap-4">
              <div className="relative h-[78px] w-[78px] shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={user.image}
                  src={avatarSrc(user.image, avatarVersion)}
                  alt="profile"
                  className="h-full w-full rounded-2xl border-2 border-orange-400 object-cover shadow-md"
                />

                <label className="absolute -bottom-2 -right-2 cursor-pointer rounded-full bg-orange-500 p-2 shadow-md transition hover:scale-110">
                  <Edit size={13} className="text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingAvatar}
                    onChange={handleImageChange}
                  />
                </label>
              </div>

              <div className="min-w-0 pr-10">
                <p className="break-words text-lg font-semibold leading-tight text-gray-800">{user.name || "Student"}</p>
                <p className="mt-1 break-words text-xs text-gray-500">{user.email}</p>
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-semibold uppercase text-orange-600">
                  <User size={12} />
                  GateVault User
                </div>
              </div>
            </div>
          </section>

          {message && (
            <div className={`mt-4 rounded-xl px-3 py-2 text-center text-xs ${message.includes("successfully") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
              {message}
            </div>
          )}

          <section className="mt-5 rounded-3xl bg-gray-100/80 p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700">Student details</p>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-medium text-gray-400">Signup info</span>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <ProfileField
                icon={<IdCard size={15} />}
                label="University ID"
                value={user.universityId}
                placeholder="KU123456"
                onChange={(value) => handleFieldChange("universityId", value)}
              />

              <ProfileField
                icon={<Phone size={15} />}
                label="Phone Number"
                value={user.phone}
                placeholder="9876543210"
                inputMode="numeric"
                maxLength={10}
                onChange={(value) => handleFieldChange("phone", value)}
              />

              <div className="grid grid-cols-2 gap-2.5">
                <ProfileField
                  icon={<Building2 size={15} />}
                  label="Department"
                  value={user.department}
                  placeholder="Department"
                  onChange={(value) => handleFieldChange("department", value)}
                />

                <ProfileField
                  icon={<School size={15} />}
                  label="Branch"
                  value={user.branch}
                  placeholder="Branch"
                  onChange={(value) => handleFieldChange("branch", value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <ProfileField
                  icon={<School size={15} />}
                  label="Semester"
                  value={user.semester}
                  placeholder="Semester"
                  onChange={(value) => handleFieldChange("semester", value)}
                />

                <ProfileField
                  icon={<Hash size={15} />}
                  label="Section"
                  value={user.section}
                  placeholder="Section"
                  onChange={(value) => handleFieldChange("section", value)}
                />
              </div>
            </div>
          </section>

          <section className="mt-3 rounded-3xl bg-gray-100/80 p-3 sm:p-4">
            <p className="mb-3 text-xs font-semibold text-gray-700">Campus stay</p>
            <div className="grid grid-cols-2 gap-2.5">
              <ProfileField
                icon={<Building2 size={15} />}
                label="Hostel"
                value={user.hostel}
                placeholder="Hostel"
                onChange={(value) => handleFieldChange("hostel", value)}
              />

              <ProfileField
                icon={<Hash size={15} />}
                label="Room"
                value={user.room}
                placeholder="Room"
                onChange={(value) => handleFieldChange("room", value)}
              />
            </div>
          </section>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-4 w-full rounded-2xl bg-gradient-to-r from-orange-400 to-orange-600 py-3 text-center font-medium text-white shadow-md transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
          >
            <span className="inline-flex items-center gap-2">
              <Save size={16} />
              {saving ? "Saving..." : "Save Details"}
            </span>
          </button>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => router.push("/log")}
              className="rounded-2xl bg-gray-100 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-200 active:scale-[0.98]"
            >
              View Activity
            </button>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-50 py-3 text-sm font-medium text-red-500 transition hover:bg-red-100 active:scale-[0.98]"
            >
              <LogOut size={16} />
              Log out
            </button>
          </div>
        </main>

        <div className="bottom-nav-shell absolute bottom-4 left-1/2 flex w-[min(320px,calc(100%-32px))] -translate-x-1/2 justify-around rounded-2xl py-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex flex-col items-center text-gray-400 transition hover:text-orange-500"
          >
            <Home size={22} className="mb-1" />
            <p className="text-[10px]">Home</p>
          </button>

          <div className="relative flex flex-col items-center text-orange-500">
            <div className="absolute -bottom-1 h-1 w-6 rounded-full bg-orange-500" />
            <User size={22} className="mb-1" />
            <p className="text-[10px] font-medium">Profile</p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="flex flex-col items-center text-gray-400 transition hover:text-orange-500"
          >
            <Settings size={22} className="mb-1" />
            <p className="text-[10px]">Settings</p>
          </button>
        </div>
      </div>
    </div>
  );
}
