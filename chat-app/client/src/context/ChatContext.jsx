import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

import api from "../api/axios";
import { useAuth } from "./AuthContext";

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingFrom, setTypingFrom] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const socketRef = useRef(null);
  const selectedUserRef = useRef(null);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    if (!token) {
      setUsers([]);
      setSelectedUser(null);
      setMessages([]);
      setOnlineUsers([]);
      return;
    }

    const fetchUsers = async () => {
      const { data } = await api.get("/users");
      setUsers(data.users);
    };

    fetchUsers();
  }, [token]);

  useEffect(() => {
    if (!token || !user?._id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
      auth: { token },
    });

    socketRef.current = socket;

    socket.on("users:online", (ids) => {
      setOnlineUsers(ids || []);
    });

    socket.on("user:online", ({ userId }) => {
      setUsers((prev) =>
        prev.map((item) =>
          item._id === userId ? { ...item, isOnline: true, lastSeenAt: null } : item
        )
      );
    });

    socket.on("user:offline", ({ userId, lastSeenAt }) => {
      setUsers((prev) =>
        prev.map((item) =>
          item._id === userId ? { ...item, isOnline: false, lastSeenAt } : item
        )
      );
    });

    socket.on("typing:start", ({ from }) => {
      setTypingFrom(from);
    });

    socket.on("typing:stop", ({ from }) => {
      setTypingFrom((prev) => (prev === from ? null : prev));
    });

    // Append only messages that belong to the currently opened one-to-one thread.
    socket.on("message:new", (message) => {
      const activeUser = selectedUserRef.current;

      if (
        !activeUser ||
        ![
          `${message.sender}-${message.recipient}`,
          `${message.recipient}-${message.sender}`,
        ].includes(`${user._id}-${activeUser._id}`)
      ) {
        return;
      }

      setMessages((prev) => {
        if (prev.some((item) => item._id === message._id)) {
          return prev;
        }
        return [...prev, message];
      });
    });

    // Update local message state when the other user sees sent messages.
    socket.on("receipt:seen", ({ byUserId }) => {
      setMessages((prev) =>
        prev.map((message) => {
          if (message.sender !== user._id) {
            return message;
          }
          if (message.readBy?.includes(byUserId)) {
            return message;
          }
          return { ...message, readBy: [...(message.readBy || []), byUserId] };
        })
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user?._id]);

  const fetchConversation = async (otherUserId) => {
    if (!otherUserId) return;
    setLoadingMessages(true);
    try {
      const { data } = await api.get(`/messages/${otherUserId}`);
      setMessages(data.messages);
      // Opening a chat marks inbound messages as seen on both server and socket layers.
      await api.patch(`/messages/${otherUserId}/seen`);
      socketRef.current?.emit("receipt:seen", { withUserId: otherUserId });
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async (content) => {
    if (!selectedUser?._id || !content.trim()) {
      return;
    }

    socketRef.current?.emit("message:send", {
      to: selectedUser._id,
      content,
    });
  };

  const emitTypingStart = () => {
    if (!selectedUser?._id) return;
    socketRef.current?.emit("typing:start", { to: selectedUser._id });
  };

  const emitTypingStop = () => {
    if (!selectedUser?._id) return;
    socketRef.current?.emit("typing:stop", { to: selectedUser._id });
  };

  const value = useMemo(
    () => ({
      users,
      selectedUser,
      setSelectedUser,
      messages,
      loadingMessages,
      onlineUsers,
      typingFrom,
      fetchConversation,
      sendMessage,
      emitTypingStart,
      emitTypingStop,
    }),
    [users, selectedUser, messages, loadingMessages, onlineUsers, typingFrom]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
};
