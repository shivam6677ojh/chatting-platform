import { useEffect, useRef } from "react";

import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";

const formatTime = (value) =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

export default function MessageList() {
  const { user } = useAuth();
  const {
    messages,
    users,
    selectedUser,
    selectedGroup,
    typingFrom,
    groupTypingBy,
    loadingMessages,
  } = useChat();
  const endRef = useRef(null);

  const getUserName = (id) => {
    if (id === user?._id) {
      return "You";
    }
    return users.find((person) => person._id === id)?.name || "Member";
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typingFrom]);

  if (!selectedUser && !selectedGroup) {
    return <div className="empty-chat">Pick a conversation to start chatting.</div>;
  }

  if (loadingMessages) {
    return <div className="empty-chat">Loading messages...</div>;
  }

  return (
    <div className="message-list">
      {messages.map((message) => {
        const mine = message.sender === user._id;
        const seen = message.readBy?.includes(selectedUser?._id);
        const showSender = selectedGroup && !mine;

        return (
          <article key={message._id} className={`message-bubble ${mine ? "mine" : "theirs"}`}>
            {showSender && <strong className="group-sender">{getUserName(message.sender)}</strong>}
            <p>{message.content}</p>
            <div className="meta-row">
              <span>{formatTime(message.createdAt)}</span>
              {mine && selectedUser && <span>{seen ? "Seen" : "Unseen"}</span>}
            </div>
          </article>
        );
      })}
      {selectedUser && typingFrom === selectedUser._id && (
        <div className="typing-chip">{selectedUser.name} is typing...</div>
      )}
      {selectedGroup && groupTypingBy.length > 0 && (
        <div className="typing-chip">
          {groupTypingBy.map((id) => getUserName(id)).join(", ")} typing...
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
