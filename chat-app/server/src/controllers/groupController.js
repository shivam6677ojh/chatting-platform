import mongoose from "mongoose";

import Group from "../models/Group.js";
import { getActiveSocketIds, getIO } from "../services/socket.js";

export const getGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate("members", "_id name email isOnline lastSeenAt")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ groups });
  } catch (error) {
    next(error);
  }
};

export const createGroup = async (req, res, next) => {
  try {
    const { name, memberIds = [] } = req.body;

    if (!name?.trim()) {
      const error = new Error("Group name is required");
      error.status = 400;
      throw error;
    }

    const creatorId = req.user._id.toString();
    const uniqueIds = new Set([creatorId]);

    memberIds.forEach((id) => {
      if (mongoose.isValidObjectId(id)) {
        uniqueIds.add(id.toString());
      }
    });

    if (uniqueIds.size < 2) {
      const error = new Error("A group requires at least 2 members including you");
      error.status = 400;
      throw error;
    }

    const group = await Group.create({
      name: name.trim(),
      members: Array.from(uniqueIds),
      createdBy: creatorId,
    });

    const fullGroup = await Group.findById(group._id)
      .populate("members", "_id name email isOnline lastSeenAt")
      .lean();

    const io = getIO();
    fullGroup.members.forEach((member) => {
      getActiveSocketIds(member._id.toString()).forEach((socketId) => {
        const activeSocket = io.sockets.sockets.get(socketId);
        activeSocket?.join(`group:${group._id.toString()}`);
        io.to(socketId).emit("group:created", { group: fullGroup });
      });
    });

    res.status(201).json({ group: fullGroup });
  } catch (error) {
    next(error);
  }
};
