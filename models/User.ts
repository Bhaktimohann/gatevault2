import { Schema, model, models } from "mongoose";

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
    universityId: {
      type: String,
    },
    password: {
      type: String,
      required: false,
    },
    semester: {
      type: String,
    },
    department: {
      type: String,
    },
    branch: {
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
    role: {
      type: String,
      enum: ["student", "admin", "hod", "warden", "security"],
      default: "student",
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ email: 1 });

if (models.User) {
  const rolePath = models.User.schema.path("role") as { enumValues?: string[] } | undefined;
  if (rolePath?.enumValues && !rolePath.enumValues.includes("warden")) {
    rolePath.enumValues.push("warden");
  }
}

const User = models.User || model("User", UserSchema);

export default User;
