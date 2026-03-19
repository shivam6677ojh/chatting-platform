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
  const { selectedUser, onlineUsers } = useChat();

  const isOnline = selectedUser && onlineUsers.includes(selectedUser._id);

  return (
    <header className="chat-header sheen-slide">
      <div>
        <h2>{selectedUser ? selectedUser.name : "Select a user"}</h2>
        {selectedUser && (
          <small>{isOnline ? "Online now" : formatLastSeen(selectedUser.lastSeenAt)}</small>
        )}
      </div>
      <button onClick={logout} className="ghost-btn" type="button">
        Logout
      </button>
    </header>
  );
}
