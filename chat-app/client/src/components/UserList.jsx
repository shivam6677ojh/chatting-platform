import { useState } from "react";
import { useNavigate } from "react-router-dom";

import CreateGroupModal from "./CreateGroupModal";
import { useChat } from "../context/ChatContext";

export default function UserList() {
  const navigate = useNavigate();
  const {
    users,
    groups,
    selectedUser,
    selectedGroup,
    selectUser,
    selectGroup,
    onlineUsers,
  } = useChat();
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  const handleGroupCreated = (group) => {
    selectGroup(group);
    setGroupModalOpen(false);
    navigate(`/chat/group/${group._id}`);
  };

  return (
    <>
      <aside className="users-panel">
        <div className="users-title">
          <span>Chats</span>
          <button
            type="button"
            className="mini-btn"
            onClick={() => setGroupModalOpen(true)}
          >
            + Group
          </button>
        </div>
        <div className="users-list">
          {groups.map((group, index) => {
            const active = selectedGroup?._id === group._id;

            return (
              <button
                key={group._id}
                type="button"
                className={`user-item ${active ? "active" : ""}`}
                onClick={() => {
                  selectGroup(group);
                  navigate(`/chat/group/${group._id}`);
                }}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="status-dot online" />
                <div className="user-meta">
                  <strong>{group.name}</strong>
                  <small>{group.members?.length || 0} members</small>
                </div>
              </button>
            );
          })}

          {users.map((person, index) => {
            const active = selectedUser?._id === person._id && !selectedGroup;
            const online = onlineUsers.includes(person._id);

            return (
              <button
                key={person._id}
                type="button"
                className={`user-item ${active ? "active" : ""}`}
                onClick={() => {
                  selectUser(person);
                  navigate(`/chat/user/${person._id}`);
                }}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className={`status-dot ${online ? "online" : "offline"}`} />
                <div className="user-meta">
                  <strong>{person.name}</strong>
                  <small>{online ? "Online" : "Offline"}</small>
                </div>
              </button>
            );
          })}
        </div>
      </aside>
      <CreateGroupModal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        onCreated={handleGroupCreated}
      />
    </>
  );
}
