import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

import api from "../api/axios";
import { useAuth } from "./AuthContext";

const ChatContext = createContext(null);

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const ChatProvider = ({ children }) => {
  const { token, user, loading: authLoading, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingFrom, setTypingFrom] = useState(null);
  const [groupTypingBy, setGroupTypingBy] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callState, setCallState] = useState({
    status: "idle",
    type: null,
    withUserId: null,
    withName: null,
  });
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const socketRef = useRef(null);
  const selectedUserRef = useRef(null);
  const selectedGroupRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const callPeerUserIdRef = useRef(null);

  const appendMessageIfMissing = (message) => {
    if (!message?._id) {
      return;
    }

    setMessages((prev) => {
      if (prev.some((item) => item._id === message._id)) {
        return prev;
      }
      return [...prev, message];
    });
  };

  const upsertGroupInState = (groupPayload) => {
    if (!groupPayload?._id) {
      return;
    }

    setGroups((prev) => {
      const existing = prev.some((group) => group._id === groupPayload._id);
      if (!existing) {
        return [groupPayload, ...prev];
      }

      return prev.map((group) => (group._id === groupPayload._id ? groupPayload : group));
    });
  };

  const removeGroupFromState = (groupId) => {
    if (!groupId) {
      return;
    }

    setGroups((prev) => prev.filter((group) => group._id !== groupId));
    setSelectedGroup((prev) => (prev?._id === groupId ? null : prev));
    setMessages((prev) => (selectedGroupRef.current?._id === groupId ? [] : prev));
    setGroupTypingBy([]);
  };

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
  }, [selectedGroup]);

  const cleanupPeer = (shouldStopStreams = true) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (shouldStopStreams) {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => track.stop());
      }

      setLocalStream(null);
      setRemoteStream(null);
    }

    callPeerUserIdRef.current = null;
  };

  const ensureMediaStream = async (callType) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === "video",
    });

    setLocalStream(stream);
    return stream;
  };

  const createPeerConnection = (toUserId, mediaStream) => {
    const peerConnection = new RTCPeerConnection(RTC_CONFIG);

    mediaStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, mediaStream);
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("call:ice-candidate", {
          toUserId,
          candidate: event.candidate,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        setRemoteStream(stream);
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(peerConnection.connectionState)) {
        cleanupPeer();
        setCallState({
          status: "idle",
          type: null,
          withUserId: null,
          withName: null,
        });
      }
    };

    peerConnectionRef.current = peerConnection;
    callPeerUserIdRef.current = toUserId;

    return peerConnection;
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!token) {
      setUsers([]);
      setGroups([]);
      setSelectedUser(null);
      setSelectedGroup(null);
      setMessages([]);
      setOnlineUsers([]);
      setTypingFrom(null);
      setGroupTypingBy([]);
      setIncomingCall(null);
      cleanupPeer();
      return;
    }

    let isCancelled = false;

    const fetchData = async () => {
      try {
        const [{ data: usersData }, { data: groupsData }] = await Promise.all([
          api.get("/users"),
          api.get("/groups"),
        ]);

        if (!isCancelled) {
          setUsers(usersData.users || []);
          setGroups(groupsData.groups || []);
        }
      } catch (error) {
        if (error.response?.status === 401) {
          logout();
        }
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [token, authLoading, logout]);

  useEffect(() => {
    if (authLoading || !token || !user?._id) {
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

    socket.on("group:created", ({ group }) => {
      upsertGroupInState(group);
    });

    socket.on("group:updated", ({ group }) => {
      upsertGroupInState(group);

      if (selectedGroupRef.current?._id === group?._id) {
        setSelectedGroup(group);
      }
    });

    socket.on("group:left", ({ groupId }) => {
      removeGroupFromState(groupId);
    });

    socket.on("group:deleted", ({ groupId }) => {
      removeGroupFromState(groupId);
    });

    socket.on("typing:start", ({ from }) => {
      setTypingFrom(from);
    });

    socket.on("typing:stop", ({ from }) => {
      setTypingFrom((prev) => (prev === from ? null : prev));
    });

    socket.on("typing:group:start", ({ from, groupId }) => {
      if (selectedGroupRef.current?._id !== groupId) {
        return;
      }

      setGroupTypingBy((prev) => (prev.includes(from) ? prev : [...prev, from]));
    });

    socket.on("typing:group:stop", ({ from, groupId }) => {
      if (selectedGroupRef.current?._id !== groupId) {
        return;
      }

      setGroupTypingBy((prev) => prev.filter((id) => id !== from));
    });

    socket.on("message:new", (message) => {
      const activeUser = selectedUserRef.current;
      if (!activeUser) {
        return;
      }

      const belongsToActiveDirect = [
        `${message.sender}-${message.recipient}`,
        `${message.recipient}-${message.sender}`,
      ].includes(`${user._id}-${activeUser._id}`);

      if (!belongsToActiveDirect) {
        return;
      }

      appendMessageIfMissing(message);
    });

    socket.on("message:group:new", (message) => {
      const activeGroup = selectedGroupRef.current;

      if (!activeGroup || activeGroup._id !== message.group) {
        return;
      }

      appendMessageIfMissing(message);
    });

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

    socket.on("call:incoming", ({ fromUserId, fromName, callType, offer }) => {
      setIncomingCall({ fromUserId, fromName, callType, offer });
      setCallState({
        status: "ringing",
        type: callType,
        withUserId: fromUserId,
        withName: fromName,
      });
    });

    socket.on("call:answered", async ({ fromUserId, answer }) => {
      if (!peerConnectionRef.current || callPeerUserIdRef.current !== fromUserId) {
        return;
      }

      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      setCallState((prev) => ({ ...prev, status: "in-call" }));
    });

    socket.on("call:ice-candidate", async ({ fromUserId, candidate }) => {
      if (!peerConnectionRef.current || callPeerUserIdRef.current !== fromUserId) {
        return;
      }

      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on("call:ended", ({ fromUserId }) => {
      if (callPeerUserIdRef.current && callPeerUserIdRef.current !== fromUserId) {
        return;
      }

      cleanupPeer();
      setIncomingCall(null);
      setCallState({
        status: "idle",
        type: null,
        withUserId: null,
        withName: null,
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user?._id, authLoading]);

  const fetchConversation = async (otherUserId) => {
    if (!otherUserId) return;

    setLoadingMessages(true);
    setTypingFrom(null);
    setGroupTypingBy([]);

    try {
      const { data } = await api.get(`/messages/${otherUserId}`);
      setMessages(data.messages || []);
      await api.patch(`/messages/${otherUserId}/seen`);
      socketRef.current?.emit("receipt:seen", { withUserId: otherUserId });
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchGroupConversation = async (groupId) => {
    if (!groupId) return;

    setLoadingMessages(true);
    setTypingFrom(null);
    setGroupTypingBy([]);

    try {
      const { data } = await api.get(`/messages/group/${groupId}`);
      setMessages(data.messages || []);
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoadingMessages(false);
    }
  };

  const selectUser = (person) => {
    setSelectedUser(person);
    setSelectedGroup(null);
    setGroupTypingBy([]);
  };

  const selectGroup = (group) => {
    setSelectedGroup(group);
    setSelectedUser(null);
    setTypingFrom(null);
  };

  const sendMessage = async (content) => {
    const clean = content.trim();
    if (!clean) return;

    try {
      if (selectedGroup?._id) {
        const { data } = await api.post("/messages/group", {
          groupId: selectedGroup._id,
          content: clean,
        });
        appendMessageIfMissing(data.message);
        return;
      }

      if (!selectedUser?._id) return;

      const { data } = await api.post("/messages", {
        recipientId: selectedUser._id,
        content: clean,
      });
      appendMessageIfMissing(data.message);
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
      }
      throw error;
    }
  };

  const emitTypingStart = () => {
    if (selectedGroup?._id) {
      socketRef.current?.emit("typing:start-group", { groupId: selectedGroup._id });
      return;
    }

    if (!selectedUser?._id) return;
    socketRef.current?.emit("typing:start", { to: selectedUser._id });
  };

  const emitTypingStop = () => {
    if (selectedGroup?._id) {
      socketRef.current?.emit("typing:stop-group", { groupId: selectedGroup._id });
      return;
    }

    if (!selectedUser?._id) return;
    socketRef.current?.emit("typing:stop", { to: selectedUser._id });
  };

  const createGroup = async ({ name, memberIds }) => {
    const { data } = await api.post("/groups", { name, memberIds });
    upsertGroupInState(data.group);
    return data.group;
  };

  const searchGroupMembers = async (query) => {
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
      return [];
    }

    const { data } = await api.get("/groups/search-members", {
      params: { q: cleanQuery },
    });

    return data.users || [];
  };

  const getGroupDetails = async (groupId) => {
    if (!groupId) {
      return null;
    }

    const { data } = await api.get(`/groups/${groupId}`);
    if (data.group) {
      upsertGroupInState(data.group);
    }

    return data.group || null;
  };

  const leaveGroup = async (groupId) => {
    if (!groupId) {
      return;
    }

    await api.post(`/groups/${groupId}/leave`);
    removeGroupFromState(groupId);
  };

  const deleteGroup = async (groupId) => {
    if (!groupId) {
      return;
    }

    await api.delete(`/groups/${groupId}`);
    removeGroupFromState(groupId);
  };

  const startCall = async (callType) => {
    if (!selectedUser?._id || !socketRef.current) {
      return;
    }

    try {
      setIncomingCall(null);
      cleanupPeer();

      const mediaStream = await ensureMediaStream(callType);
      const peer = createPeerConnection(selectedUser._id, mediaStream);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      socketRef.current.emit("call:start", {
        toUserId: selectedUser._id,
        callType,
        offer,
      });

      setCallState({
        status: "calling",
        type: callType,
        withUserId: selectedUser._id,
        withName: selectedUser.name,
      });
    } catch (_error) {
      cleanupPeer();
      setCallState({ status: "idle", type: null, withUserId: null, withName: null });
    }
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall || !socketRef.current) {
      return;
    }

    try {
      const mediaStream = await ensureMediaStream(incomingCall.callType);
      cleanupPeer(false);

      const peer = createPeerConnection(incomingCall.fromUserId, mediaStream);
      await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socketRef.current.emit("call:answer", {
        toUserId: incomingCall.fromUserId,
        answer,
      });

      setCallState({
        status: "in-call",
        type: incomingCall.callType,
        withUserId: incomingCall.fromUserId,
        withName: incomingCall.fromName,
      });
      setIncomingCall(null);
    } catch (_error) {
      cleanupPeer();
      setIncomingCall(null);
      setCallState({ status: "idle", type: null, withUserId: null, withName: null });
    }
  };

  const declineIncomingCall = () => {
    if (!incomingCall || !socketRef.current) {
      return;
    }

    socketRef.current.emit("call:end", {
      toUserId: incomingCall.fromUserId,
      reason: "declined",
    });

    setIncomingCall(null);
    setCallState({ status: "idle", type: null, withUserId: null, withName: null });
  };

  const endCall = () => {
    if (callPeerUserIdRef.current && socketRef.current) {
      socketRef.current.emit("call:end", {
        toUserId: callPeerUserIdRef.current,
        reason: "ended",
      });
    }

    cleanupPeer();
    setIncomingCall(null);
    setCallState({ status: "idle", type: null, withUserId: null, withName: null });
  };

  useEffect(() => {
    return () => {
      cleanupPeer();
    };
  }, []);

  const value = useMemo(
    () => ({
      users,
      groups,
      selectedUser,
      selectedGroup,
      selectUser,
      selectGroup,
      messages,
      loadingMessages,
      onlineUsers,
      typingFrom,
      groupTypingBy,
      fetchConversation,
      fetchGroupConversation,
      sendMessage,
      emitTypingStart,
      emitTypingStop,
      createGroup,
      searchGroupMembers,
      getGroupDetails,
      leaveGroup,
      deleteGroup,
      startCall,
      incomingCall,
      callState,
      localStream,
      remoteStream,
      acceptIncomingCall,
      declineIncomingCall,
      endCall,
    }),
    [
      users,
      groups,
      selectedUser,
      selectedGroup,
      messages,
      loadingMessages,
      onlineUsers,
      typingFrom,
      groupTypingBy,
      incomingCall,
      callState,
      localStream,
      remoteStream,
    ]
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
