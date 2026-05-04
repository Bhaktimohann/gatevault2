import mongoose, { Schema, model, models } from "mongoose";

const NotificationSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pass",
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["info", "warning", "success", "error"],
      default: "info",
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, read: 1 });

const Notification = models.Notification || model("Notification", NotificationSchema);

export default Notification;
