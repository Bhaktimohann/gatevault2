export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  semester?: string;
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
  timeOut: string;
  timeIn: string;
  person?: string;
  personPhone?: string;
  status: "Active" | "Expired" | "Pending";
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  message?: string;
  pass?: T;
  passes?: T[];
}