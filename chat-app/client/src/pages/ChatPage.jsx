import { useEffect } from "react";

import CallOverlay from "../components/CallOverlay";
import ChatHeader from "../components/ChatHeader";
import MessageInput from "../components/MessageInput";
import MessageList from "../components/MessageList";
import UserList from "../components/UserList";
import { useChat } from "../context/ChatContext";

export default function ChatPage() {
  const { selectedUser, selectedGroup, fetchConversation, fetchGroupConversation } = useChat();

  useEffect(() => {
    if (selectedUser?._id) {
      fetchConversation(selectedUser._id);
      return;
    }

    if (selectedGroup?._id) {
      fetchGroupConversation(selectedGroup._id);
    }
  }, [selectedUser?._id, selectedGroup?._id]);

  return (
    <main className="chat-shell">
      <section className="chat-frame">
        <UserList />
        <section className="conversation">
          <ChatHeader />
          <MessageList />
          <MessageInput />
        </section>
      </section>
      <CallOverlay />
    </main>
  );
}
