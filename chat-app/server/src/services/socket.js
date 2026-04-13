import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import Message from "../models/Message.js";
import Group from "../models/Group.js";

let io;
const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const isLocalhostOrigin = (origin = "") => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
const userSocketMap = new Map();

const ensureUserSocketSet = (userId) => {
  if (!userSocketMap.has(userId)) {
    userSocketMap.set(userId, new Set());
  }
  return userSocketMap.get(userId);
};

export const getActiveSocketIds = (userId) => {
  return Array.from(userSocketMap.get(userId?.toString()) || []);
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

const emitOnlineUsers = () => {
  const onlineUserIds = Array.from(userSocketMap.keys());
  io.emit("users:online", onlineUserIds);
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Unauthorized"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("_id name email");

    if (!user) {
      return next(new Error("User not found"));
    }

    socket.user = user;
    next();
  } catch (_error) {
    next(new Error("Unauthorized"));
  }
};

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || isLocalhostOrigin(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();
    const sockets = ensureUserSocketSet(userId);
    sockets.add(socket.id);
    socket.join(`user:${userId}`);

    const groups = await Group.find({ members: userId }).select("_id").lean();
    groups.forEach((group) => {
      socket.join(`group:${group._id.toString()}`);
    });

    await User.findByIdAndUpdate(userId, { isOnline: true });

    io.emit("user:online", { userId });
    emitOnlineUsers();

    socket.on("typing:start", ({ to }) => {
      getActiveSocketIds(to).forEach((socketId) => {
        io.to(socketId).emit("typing:start", { from: userId });
      });
    });

    socket.on("typing:stop", ({ to }) => {
      getActiveSocketIds(to).forEach((socketId) => {
        io.to(socketId).emit("typing:stop", { from: userId });
      });
    });

    socket.on("typing:start-group", async ({ groupId }) => {
      if (!groupId) return;

      const group = await Group.findOne({ _id: groupId, members: userId }).select("_id").lean();
      if (!group) return;

      socket.to(`group:${groupId}`).emit("typing:group:start", {
        from: userId,
        groupId,
      });
    });

    socket.on("typing:stop-group", async ({ groupId }) => {
      if (!groupId) return;

      const group = await Group.findOne({ _id: groupId, members: userId }).select("_id").lean();
      if (!group) return;

      socket.to(`group:${groupId}`).emit("typing:group:stop", {
        from: userId,
        groupId,
      });
    });

    // Socket message sending allows instant delivery while also persisting chat history.
    socket.on("message:send", async ({ to, content }) => {
      if (!to || !content?.trim()) {
        return;
      }

      const newMessage = await Message.create({
        sender: userId,
        recipient: to,
        content: content.trim(),
        readBy: [userId],
      });

      const payload = await Message.findById(newMessage._id).lean();

      getActiveSocketIds(to).forEach((socketId) => {
        io.to(socketId).emit("message:new", payload);
      });

      socket.emit("message:new", payload);
    });

    socket.on("message:send-group", async ({ groupId, content }) => {
      if (!groupId || !content?.trim()) {
        return;
      }

      const group = await Group.findOne({ _id: groupId, members: userId }).select("_id").lean();
      if (!group) {
        return;
      }

      const newMessage = await Message.create({
        conversationType: "group",
        sender: userId,
        group: groupId,
        content: content.trim(),
        readBy: [userId],
      });

      const payload = await Message.findById(newMessage._id).lean();
      io.to(`group:${groupId}`).emit("message:group:new", payload);
    });

    socket.on("call:start", ({ toUserId, callType, offer }) => {
      if (!toUserId || !offer) {
        return;
      }

      getActiveSocketIds(toUserId).forEach((socketId) => {
        io.to(socketId).emit("call:incoming", {
          fromUserId: userId,
          fromName: socket.user.name,
          callType: callType === "video" ? "video" : "audio",
          offer,
        });
      });
    });

    socket.on("call:answer", ({ toUserId, answer }) => {
      if (!toUserId || !answer) {
        return;
      }

      getActiveSocketIds(toUserId).forEach((socketId) => {
        io.to(socketId).emit("call:answered", {
          fromUserId: userId,
          answer,
        });
      });
    });

    socket.on("call:ice-candidate", ({ toUserId, candidate }) => {
      if (!toUserId || !candidate) {
        return;
      }

      getActiveSocketIds(toUserId).forEach((socketId) => {
        io.to(socketId).emit("call:ice-candidate", {
          fromUserId: userId,
          candidate,
        });
      });
    });

    socket.on("call:end", ({ toUserId, reason }) => {
      if (!toUserId) {
        return;
      }

      getActiveSocketIds(toUserId).forEach((socketId) => {
        io.to(socketId).emit("call:ended", {
          fromUserId: userId,
          reason: reason || "ended",
        });
      });
    });

    socket.on("receipt:seen", ({ withUserId }) => {
      if (!withUserId) {
        return;
      }

      getActiveSocketIds(withUserId).forEach((socketId) => {
        io.to(socketId).emit("receipt:seen", {
          byUserId: userId,
        });
      });
    });

    socket.on("disconnect", async () => {
      const socketSet = userSocketMap.get(userId);
      if (socketSet) {
        socketSet.delete(socket.id);
      }

      if (!socketSet || socketSet.size === 0) {
        userSocketMap.delete(userId);
        const now = new Date();

        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeenAt: now,
        });

        io.emit("user:offline", { userId, lastSeenAt: now.toISOString() });
      }

      emitOnlineUsers();
    });
  });

  return io;
};
