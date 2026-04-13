import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 40,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
      required: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },
    password: {
      type: String,
      required: function requiredPassword() {
        return this.authProvider === "local";
      },
      minlength: 6,
      default: null,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeenAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
