import { useEffect, useRef, useState } from "react";

import { useChat } from "../context/ChatContext";

export default function MessageInput() {
  const [text, setText] = useState("");
  const typingTimeoutRef = useRef(null);
  const { selectedUser, sendMessage, emitTypingStart, emitTypingStop } = useChat();

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const onChange = (event) => {
    setText(event.target.value);
    emitTypingStart();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop();
    }, 800);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;

    await sendMessage(value);
    setText("");
    emitTypingStop();
  };

  return (
    <form className="message-input-wrap" onSubmit={onSubmit}>
      <input
        disabled={!selectedUser}
        value={text}
        onChange={onChange}
        placeholder={selectedUser ? "Type your message" : "Select someone to chat"}
      />
      <button type="submit" disabled={!selectedUser || !text.trim()}>
        Send
      </button>
    </form>
  );
}
