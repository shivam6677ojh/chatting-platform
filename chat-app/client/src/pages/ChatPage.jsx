import { useEffect } from "react";
import { useParams } from "react-router-dom";

import CallOverlay from "../components/CallOverlay";
import ChatHeader from "../components/ChatHeader";
import MessageInput from "../components/MessageInput";
import MessageList from "../components/MessageList";
import UserList from "../components/UserList";
import { useChat } from "../context/ChatContext";

export default function ChatPage() {
  const { userId, groupId } = useParams();
  const {
    users,
    groups,
    selectedUser,
    selectedGroup,
    selectUser,
    selectGroup,
    fetchConversation,
    fetchGroupConversation,
    getGroupDetails,
  } = useChat();

  useEffect(() => {
    let isCancelled = false;

    const syncSelectionFromRoute = async () => {
      if (userId) {
        const matchedUser = users.find((item) => item._id === userId);
        if (matchedUser && selectedUser?._id !== userId) {
          selectUser(matchedUser);
        }
        return;
      }

      if (groupId) {
        let matchedGroup = groups.find((item) => item._id === groupId);
        if (!matchedGroup) {
          try {
            matchedGroup = await getGroupDetails(groupId);
          } catch (_error) {
            matchedGroup = null;
          }
        }

        if (!isCancelled && matchedGroup && selectedGroup?._id !== groupId) {
          selectGroup(matchedGroup);
        }
      }
    };

    syncSelectionFromRoute();

    return () => {
      isCancelled = true;
    };
  }, [
    userId,
    groupId,
    users,
    groups,
    selectedUser?._id,
    selectedGroup?._id,
  ]);

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
