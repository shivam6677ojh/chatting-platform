import { useEffect, useMemo, useState } from "react";

import { useChat } from "../context/ChatContext";

const formatMemberState = (user) => {
  if (user.isOnline) {
    return "Online";
  }

  if (!user.lastSeenAt) {
    return "Offline";
  }

  return `Last seen ${new Date(user.lastSeenAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

export default function CreateGroupModal({ isOpen, onClose, onCreated }) {
  const { users, searchGroupMembers, createGroup } = useChat();

  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [candidateUsers, setCandidateUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setSearch("");
      setCandidateUsers([]);
      setSelectedIds([]);
      setSaving(false);
      setSearching(false);
      setError("");
      return;
    }

    setCandidateUsers(users.slice(0, 8));
  }, [isOpen, users]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const controller = new AbortController();

    const run = async () => {
      const clean = search.trim();
      if (clean.length < 2) {
        setCandidateUsers(users.slice(0, 8));
        return;
      }

      setSearching(true);
      try {
        const found = await searchGroupMembers(clean);
        if (!controller.signal.aborted) {
          setCandidateUsers(found);
        }
      } catch (_error) {
        if (!controller.signal.aborted) {
          setError("Unable to search users right now");
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    };

    const timer = window.setTimeout(run, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [isOpen, search, users, searchGroupMembers]);

  const selectedUsers = useMemo(() => {
    const knownUsers = [...candidateUsers, ...users];
    const byId = new Map(knownUsers.map((member) => [member._id, member]));
    return selectedIds
      .map((id) => byId.get(id))
      .filter(Boolean);
  }, [candidateUsers, users, selectedIds]);

  const toggleSelected = (userId) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Group name is required");
      return;
    }

    if (selectedIds.length === 0) {
      setError("Select at least one member");
      return;
    }

    setSaving(true);
    try {
      const group = await createGroup({
        name: name.trim(),
        memberIds: selectedIds,
      });
      if (group) {
        onCreated(group);
      }
    } catch (submitError) {
      setError(submitError.response?.data?.message || "Unable to create group");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="group-modal fade-rise"
        role="dialog"
        aria-modal="true"
        aria-label="Create group"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="group-modal-head">
          <h3>Create Group</h3>
          <button type="button" className="ghost-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <form className="group-modal-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Group name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Team Alpha"
              maxLength={60}
            />
          </label>

          <label className="field">
            <span>Search members</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Type name or email"
            />
          </label>

          <div className="group-modal-subhead">
            <strong>Members</strong>
            <small>{searching ? "Searching..." : `${candidateUsers.length} results`}</small>
          </div>

          <div className="group-candidate-list">
            {candidateUsers.map((member) => {
              const active = selectedIds.includes(member._id);

              return (
                <button
                  key={member._id}
                  type="button"
                  className={`group-candidate ${active ? "active" : ""}`}
                  onClick={() => toggleSelected(member._id)}
                >
                  <div>
                    <strong>{member.name}</strong>
                    <small>{member.email}</small>
                  </div>
                  <small>{formatMemberState(member)}</small>
                </button>
              );
            })}

            {candidateUsers.length === 0 && (
              <p className="group-empty">No users found. Try another search.</p>
            )}
          </div>

          <div className="group-modal-subhead">
            <strong>Selected ({selectedIds.length})</strong>
            <small>
              {selectedUsers.map((member) => member.name).join(", ") || "No members selected"}
            </small>
          </div>

          {error && <div className="error-box">{error}</div>}

          <button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create group chat"}
          </button>
        </form>
      </section>
    </div>
  );
}
