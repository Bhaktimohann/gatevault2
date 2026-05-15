export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  universityId?: string;
  semester?: string;
  department?: string;
  branch?: string;
  section?: string;
  hostel?: string;
  room?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Pass {
  _id: string;
  user: string;
  phone: string;
  place: string;
  purpose: string;
  passType?: "Short" | "LongLeave";
  leaveStartDate?: string;
  leaveEndDate?: string;
  timeOut: string;
  timeIn: string;
  person?: string;
  personPhone?: string;
  status: "Active" | "Out" | "Returned" | "Expired" | "Pending" | "Cancelled";
  shortPassStatus?: "Active" | "Overdue" | "On Time" | "On Time (Grace)" | "Late" | "Invalid Short Pass";
  allowedDurationHours?: number;
  graceMinutes?: number;
  expectedReturnTime?: string;
  totalDurationMinutes?: number | null;
  lateDurationMinutes?: number | null;
  approvalStatus?: "Pending" | "Approved" | "Rejected";
  hodApprovalStatus?: "NotRequired" | "Pending" | "Approved" | "Rejected";
  wardenApprovalStatus?: "NotRequired" | "Pending" | "Approved" | "Rejected";
  scannedOutAt?: string;
  scannedInAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  message?: string;
  pass?: T;
  passes?: T[];
}
