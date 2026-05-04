"use client";

import { RoleProfilePage } from "@/components/RoleProfilePage";

export default function AdminProfilePage() {
  return (
    <RoleProfilePage
      allowedRoles={["admin"]}
      dashboardHref="/admin"
      eyebrow="GateVault Admin"
      title="Admin Profile"
      dashboardStyle
      consoleLabel="Admin Console"
      profileNote="Manage your admin account details from the same console style as the approval dashboard."
    />
  );
}
