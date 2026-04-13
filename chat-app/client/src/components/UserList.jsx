import { useChat } from "../context/ChatContext";

export default function UserList() {
  const {
    users,
    groups,
    selectedUser,
    selectedGroup,
    selectUser,
    selectGroup,
    onlineUsers,
    createGroup,
  } = useChat();

  const handleCreateGroup = async () => {
    const groupName = window.prompt("Group name");
    if (!groupName?.trim()) {
      return;
    }

    const candidates = users.slice(0, 5);
    const hint = candidates.map((person) => person.name).join(", ");
    const rawNames = window.prompt(
      `Add members by name (comma separated). Available: ${hint}`
    );

    const memberIds = (rawNames || "")
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean)
      .map((name) => users.find((person) => person.name.toLowerCase() === name)?._id)
      .filter(Boolean);

    try {
      const group = await createGroup({
        name: groupName,
        memberIds,
      });

      if (group) {
        selectGroup(group);
      }
    } catch (error) {
      window.alert(error.response?.data?.message || "Unable to create group");
    }
  };

  return (
    <aside className="users-panel">
      <div className="users-title">
        <span>Chats</span>
        <button type="button" className="mini-btn" onClick={handleCreateGroup}>
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
              onClick={() => selectGroup(group)}
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
              onClick={() => selectUser(person)}
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
  );
}
