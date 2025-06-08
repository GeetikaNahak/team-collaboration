import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["owner", "editor", "viewer"],
          default: "editor",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    inviteToken: {
      type: String,
      required: true,
      unique: true,
    },
    settings: {
      allowPublicJoining: {
        type: Boolean,
        default: false,
      },
      defaultRole: {
        type: String,
        enum: ["editor", "viewer"],
        default: "editor",
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Workspace", workspaceSchema);
