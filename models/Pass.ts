import mongoose, { Schema, model, models } from "mongoose";

const PassSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    place: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      required: true,
    },
    passType: {
      type: String,
      enum: ["Short", "LongLeave"],
      default: "Short",
    },
    leaveStartDate: {
      type: Date,
    },
    leaveEndDate: {
      type: Date,
    },
    timeOut: {
      type: Date,
      required: true,
    },
    timeIn: {
      type: Date,
      required: true,
    },
    person: {
      type: String,
    },
    personPhone: {
      type: String,
    },
    status: {
      type: String,
      enum: ["Active", "Out", "Returned", "Expired", "Pending", "Cancelled"],
      default: "Active",
    },
    shortPassStatus: {
      type: String,
      enum: ["Active", "Overdue", "On Time", "On Time (Grace)", "Late", "Invalid Short Pass"],
    },
    allowedDurationHours: {
      type: Number,
    },
    graceMinutes: {
      type: Number,
    },
    expectedReturnTime: {
      type: Date,
    },
    totalDurationMinutes: {
      type: Number,
    },
    lateDurationMinutes: {
      type: Number,
    },
    approvalStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    hodApprovalStatus: {
      type: String,
      enum: ["NotRequired", "Pending", "Approved", "Rejected"],
      default: "NotRequired",
    },
    wardenApprovalStatus: {
      type: String,
      enum: ["NotRequired", "Pending", "Approved", "Rejected"],
      default: "NotRequired",
    },
    hodApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    hodApprovedAt: {
      type: Date,
    },
    hodRejectedAt: {
      type: Date,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
    scannedOutAt: {
      type: Date,
    },
    scannedOutBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    scannedInAt: {
      type: Date,
    },
    scannedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    qrTokenHash: {
      type: String,
    },
    qrTokenExpiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

PassSchema.index({ user: 1, createdAt: -1 });
PassSchema.index({ status: 1 });
PassSchema.index({ approvalStatus: 1, createdAt: -1 });
PassSchema.index({ hodApprovalStatus: 1, createdAt: -1 });
PassSchema.index({ wardenApprovalStatus: 1, createdAt: -1 });
PassSchema.index({ qrTokenHash: 1, qrTokenExpiresAt: 1 });

const Pass = models.Pass || model("Pass", PassSchema);

export default Pass;
