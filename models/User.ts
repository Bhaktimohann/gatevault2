import mongoose, { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    phone: {
      type: String,
      required: false,
    },
    password: {
      type: String,
      required: false,
    },
    semester: {
      type: String,
    },
    section: {
      type: String,
    },
    hostel: {
      type: String,
    },
    room: {
      type: String,
    },
    avatar: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ email: 1 });

const User = models.User || model("User", UserSchema);

export default User;
