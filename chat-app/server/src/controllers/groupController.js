import mongoose from "mongoose";

import Group from "../models/Group.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
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

export const getGroupById = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    if (!mongoose.isValidObjectId(groupId)) {
      const error = new Error("Invalid group id");
      error.status = 400;
      throw error;
    }

    const group = await Group.findOne({
      _id: groupId,
      members: req.user._id,
    })
      .populate("members", "_id name email isOnline lastSeenAt")
      .lean();

    if (!group) {
      const error = new Error("Group not found");
      error.status = 404;
      throw error;
    }

    res.json({ group });
  } catch (error) {
    next(error);
  }
};

export const searchGroupMembers = async (req, res, next) => {
  try {
    const query = (req.query.q || "").toString().trim();
    const parsedLimit = Number(req.query.limit);
    const limit = Number.isFinite(parsedLimit)
      ? Math.max(1, Math.min(parsedLimit, 25))
      : 10;

    if (query.length < 2) {
      return res.json({ users: [] });
    }

    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(safeQuery, "i");

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [{ name: pattern }, { email: pattern }],
    })
      .select("_id name email isOnline lastSeenAt")
      .sort({ isOnline: -1, name: 1 })
      .limit(limit)
      .lean();

    res.json({ users });
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

export const leaveGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    if (!mongoose.isValidObjectId(groupId)) {
      const error = new Error("Invalid group id");
      error.status = 400;
      throw error;
    }

    const group = await Group.findOne({
      _id: groupId,
      members: req.user._id,
    });

    if (!group) {
      const error = new Error("Group not found");
      error.status = 404;
      throw error;
    }

    const userId = req.user._id.toString();
    const creatorId = group.createdBy.toString();
    const io = getIO();

    if (creatorId === userId && group.members.length > 1) {
      const error = new Error("Admin cannot leave this group. Delete it instead.");
      error.status = 400;
      throw error;
    }

    if (creatorId === userId && group.members.length === 1) {
      const memberIds = group.members.map((id) => id.toString());

      await Message.deleteMany({
        conversationType: "group",
        group: group._id,
      });
      await Group.deleteOne({ _id: group._id });

      memberIds.forEach((memberId) => {
        getActiveSocketIds(memberId).forEach((socketId) => {
          const activeSocket = io.sockets.sockets.get(socketId);
          activeSocket?.leave(`group:${groupId}`);
          io.to(socketId).emit("group:deleted", { groupId });
        });
      });

      return res.json({
        message: "You left and deleted the group",
        groupId,
        deleted: true,
      });
    }

    group.members = group.members.filter((memberId) => memberId.toString() !== userId);
    await group.save();

    const fullGroup = await Group.findById(group._id)
      .populate("members", "_id name email isOnline lastSeenAt")
      .lean();

    getActiveSocketIds(userId).forEach((socketId) => {
      const activeSocket = io.sockets.sockets.get(socketId);
      activeSocket?.leave(`group:${groupId}`);
      io.to(socketId).emit("group:left", { groupId, leftUserId: userId });
    });

    fullGroup.members.forEach((member) => {
      getActiveSocketIds(member._id.toString()).forEach((socketId) => {
        io.to(socketId).emit("group:updated", { group: fullGroup });
      });
    });

    res.json({ message: "Left group", groupId, deleted: false });
  } catch (error) {
    next(error);
  }
};

export const deleteGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    if (!mongoose.isValidObjectId(groupId)) {
      const error = new Error("Invalid group id");
      error.status = 400;
      throw error;
    }

    const group = await Group.findOne({
      _id: groupId,
      members: req.user._id,
    }).lean();

    if (!group) {
      const error = new Error("Group not found");
      error.status = 404;
      throw error;
    }

    if (group.createdBy.toString() !== req.user._id.toString()) {
      const error = new Error("Only group admin can delete the group");
      error.status = 403;
      throw error;
    }

    await Message.deleteMany({
      conversationType: "group",
      group: group._id,
    });
    await Group.deleteOne({ _id: group._id });

    const io = getIO();
    group.members.forEach((memberId) => {
      getActiveSocketIds(memberId.toString()).forEach((socketId) => {
        const activeSocket = io.sockets.sockets.get(socketId);
        activeSocket?.leave(`group:${groupId}`);
        io.to(socketId).emit("group:deleted", { groupId });
      });
    });

    res.json({ message: "Group deleted", groupId });
  } catch (error) {
    next(error);
  }
};
