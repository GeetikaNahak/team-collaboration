import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const checkWorkspaceAccess = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user._id;

    const hasAccess = req.user.workspaces.some(
      (ws) => ws.workspace.toString() === workspaceId
    );

    if (!hasAccess) {
      return res
        .status(403)
        .json({ message: "Access denied to this workspace" });
    }

    req.workspaceId = workspaceId;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};
