"use client";

import { RoleProfilePage } from "@/components/RoleProfilePage";

export default function SecurityProfilePage() {
  return (
    <RoleProfilePage
      allowedRoles={["security", "admin"]}
      dashboardHref="/security"
      eyebrow="GateVault Security"
      title="Security Profile"
      dashboardStyle
      consoleLabel="Security Console"
      profileNote="Manage your security account details from the same console style as the scan dashboard."
    />
  );
}
