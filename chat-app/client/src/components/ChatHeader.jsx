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
  const { logout } = useAuth();
  const { selectedUser, selectedGroup, onlineUsers, startCall, callState } = useChat();

  const isOnline = selectedUser && onlineUsers.includes(selectedUser._id);
  const hasDirectSelection = Boolean(selectedUser?._id) && !selectedGroup;
  const inCall = callState.status !== "idle";

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
