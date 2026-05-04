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
  status: "Active" | "Out" | "Returned" | "Expired" | "Pending";
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
