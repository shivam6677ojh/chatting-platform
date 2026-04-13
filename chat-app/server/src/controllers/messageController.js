import Message from "../models/Message.js";
import Group from "../models/Group.js";
import { getIO, getActiveSocketIds } from "../services/socket.js";

export const getConversationMessages = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: userId },
        { sender: userId, recipient: req.user._id },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    res.json({ messages });
  } catch (error) {
    next(error);
  }
};

export const getGroupMessages = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findOne({
      _id: groupId,
      members: req.user._id,
    }).lean();

    if (!group) {
      const error = new Error("Group not found");
      error.status = 404;
      throw error;
    }

    const messages = await Message.find({
      conversationType: "group",
      group: groupId,
    })
      .sort({ createdAt: 1 })
      .lean();

    res.json({ messages, groupId });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { recipientId, content } = req.body;

    if (!recipientId || !content?.trim()) {
      const error = new Error("Recipient and content are required");
      error.status = 400;
      throw error;
    }

    const message = await Message.create({
      sender: req.user._id,
      recipient: recipientId,
      content: content.trim(),
      readBy: [req.user._id],
    });

    const fullMessage = await Message.findById(message._id).lean();
    const io = getIO();

    // Push message instantly to all active sockets of the recipient.
    getActiveSocketIds(recipientId).forEach((socketId) => {
      io.to(socketId).emit("message:new", fullMessage);
    });

    res.status(201).json({ message: fullMessage });
  } catch (error) {
    next(error);
  }
};

export const sendGroupMessage = async (req, res, next) => {
  try {
    const { groupId, content } = req.body;

    if (!groupId || !content?.trim()) {
      const error = new Error("Group and content are required");
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

    const message = await Message.create({
      conversationType: "group",
      sender: req.user._id,
      group: groupId,
      content: content.trim(),
      readBy: [req.user._id],
    });

    const fullMessage = await Message.findById(message._id).lean();
    const io = getIO();

    io.to(`group:${groupId}`).emit("message:group:new", fullMessage);

    res.status(201).json({ message: fullMessage });
  } catch (error) {
    next(error);
  }
};

export const markConversationSeen = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Mark only incoming unread messages from the selected user as seen.
    const result = await Message.updateMany(
      {
        sender: userId,
        recipient: req.user._id,
        readBy: { $ne: req.user._id },
      },
      {
        $addToSet: { readBy: req.user._id },
      }
    );

    const io = getIO();

    // Notify the original sender so the UI can update read receipts in real-time.
    getActiveSocketIds(userId).forEach((socketId) => {
      io.to(socketId).emit("receipt:seen", {
        byUserId: req.user._id.toString(),
        seenByUserId: req.user._id.toString(),
      });
    });

    res.json({ updatedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
};
