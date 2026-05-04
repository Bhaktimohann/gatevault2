"use client";

import { RoleProfilePage } from "@/components/RoleProfilePage";

export default function HodProfilePage() {
  return (
    <RoleProfilePage
      allowedRoles={["hod"]}
      dashboardHref="/hod"
      eyebrow="GateVault HOD"
      title="HOD Profile"
      dashboardStyle
    />
  );
}
