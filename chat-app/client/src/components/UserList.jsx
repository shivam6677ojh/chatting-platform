import { useChat } from "../context/ChatContext";

export default function UserList() {
  const { users, selectedUser, setSelectedUser, onlineUsers } = useChat();

  return (
    <aside className="users-panel">
      <div className="users-title">People</div>
      <div className="users-list">
        {users.map((person, index) => {
          const active = selectedUser?._id === person._id;
          const online = onlineUsers.includes(person._id);

          return (
            <button
              key={person._id}
              type="button"
              className={`user-item ${active ? "active" : ""}`}
              onClick={() => setSelectedUser(person)}
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
