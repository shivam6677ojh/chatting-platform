import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";

const formatLastSeen = (value) => {
  if (!value) return "Offline";
  return `Last seen ${new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

export default function ChatHeader() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const {
    selectedUser,
    selectedGroup,
    onlineUsers,
    startCall,
    callState,
    leaveGroup,
    deleteGroup,
  } = useChat();

  const isOnline = selectedUser && onlineUsers.includes(selectedUser._id);
  const hasDirectSelection = Boolean(selectedUser?._id) && !selectedGroup;
  const inCall = callState.status !== "idle";
  const isGroupAdmin = Boolean(
    selectedGroup &&
      user?._id &&
      selectedGroup.createdBy?.toString() === user._id.toString()
  );

  const handleLeaveGroup = async () => {
    if (!selectedGroup?._id) {
      return;
    }

    const confirmed = window.confirm("Leave this group?");
    if (!confirmed) {
      return;
    }

    try {
      await leaveGroup(selectedGroup._id);
      navigate("/chat", { replace: true });
    } catch (error) {
      window.alert(error.response?.data?.message || "Unable to leave group");
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup?._id) {
      return;
    }

    const confirmed = window.confirm("Delete this group for all members?");
    if (!confirmed) {
      return;
    }

    try {
      await deleteGroup(selectedGroup._id);
      navigate("/chat", { replace: true });
    } catch (error) {
      window.alert(error.response?.data?.message || "Unable to delete group");
    }
  };

  return (
    <header className="chat-header sheen-slide">
      <div>
        <h2>
          {selectedGroup
            ? selectedGroup.name
            : selectedUser
            ? selectedUser.name
            : "Select a user or group"}
        </h2>
        {selectedGroup && (
          <small>{selectedGroup.members?.length || 0} members</small>
        )}
        {selectedUser && !selectedGroup && (
          <small>{isOnline ? "Online now" : formatLastSeen(selectedUser.lastSeenAt)}</small>
        )}
      </div>
      <div className="header-actions">
        {selectedGroup && (
          <>
            <button onClick={handleLeaveGroup} className="ghost-btn" type="button">
              Leave
            </button>
            {isGroupAdmin && (
              <button onClick={handleDeleteGroup} className="danger-btn" type="button">
                Delete Group
              </button>
            )}
          </>
        )}
        {hasDirectSelection && (
          <>
            <button
              onClick={() => startCall("audio")}
              className="ghost-btn"
              type="button"
              disabled={inCall}
              title="Start voice call"
            >
              Voice
            </button>
            <button
              onClick={() => startCall("video")}
              className="ghost-btn"
              type="button"
              disabled={inCall}
              title="Start video call"
            >
              Video
            </button>
          </>
        )}
        <button onClick={logout} className="ghost-btn" type="button">
          Logout
        </button>
      </div>
    </header>
  );
}
