"use client";

import { RoleProfilePage } from "@/components/RoleProfilePage";

export default function WardenProfilePage() {
  return (
    <RoleProfilePage
      allowedRoles={["warden"]}
      dashboardHref="/warden"
      eyebrow="GateVault Warden"
      title="Warden Profile"
      dashboardStyle
      consoleLabel="Warden Console"
      profileNote="Manage your warden account details from the same console style as the approval dashboard."
    />
  );
}
