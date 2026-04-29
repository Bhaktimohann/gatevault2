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
      enum: ["Active", "Out", "Returned", "Expired", "Pending"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

PassSchema.index({ user: 1, createdAt: -1 });
PassSchema.index({ status: 1 });

const Pass = models.Pass || model("Pass", PassSchema);

export default Pass;
