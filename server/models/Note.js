import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      default: "",
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    versions: [
      {
        content: String,
        savedAt: {
          type: Date,
          default: Date.now,
        },
        version: Number,
      },
    ],
    isPrivate: {
      type: Boolean,
      default: false,
    },
    allowTeammateEdit: {
      type: Boolean,
      default: true,
    },
    lastEditedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

noteSchema.pre("save", function (next) {
  this.lastEditedAt = new Date();
  next();
});

export default mongoose.model("Note", noteSchema);
