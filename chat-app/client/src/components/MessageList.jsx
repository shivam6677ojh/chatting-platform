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
  const { messages, selectedUser, typingFrom, loadingMessages } = useChat();
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typingFrom]);

  if (!selectedUser) {
    return <div className="empty-chat">Pick a conversation to start chatting.</div>;
  }

  if (loadingMessages) {
    return <div className="empty-chat">Loading messages...</div>;
  }

  return (
    <div className="message-list">
      {messages.map((message) => {
        const mine = message.sender === user._id;
        const seen = message.readBy?.includes(selectedUser._id);

        return (
          <article key={message._id} className={`message-bubble ${mine ? "mine" : "theirs"}`}>
            <p>{message.content}</p>
            <div className="meta-row">
              <span>{formatTime(message.createdAt)}</span>
              {mine && <span>{seen ? "Seen" : "Unseen"}</span>}
            </div>
          </article>
        );
      })}
      {typingFrom === selectedUser._id && (
        <div className="typing-chip">{selectedUser.name} is typing...</div>
      )}
      <div ref={endRef} />
    </div>
  );
}
