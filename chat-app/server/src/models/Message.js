import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationType: {
      type: String,
      enum: ["direct", "group"],
      default: "direct",
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function requiredRecipient() {
        return this.conversationType === "direct";
      },
      default: null,
      index: true,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: function requiredGroup() {
        return this.conversationType === "group";
      },
      default: null,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ group: 1, createdAt: -1 });

export default mongoose.model("Message", messageSchema);
