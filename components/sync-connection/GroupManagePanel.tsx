"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  MdArrowBack,
  MdCheck,
  MdClose,
  MdGroups,
  MdOutlineSearch,
  MdPersonAdd,
  MdPersonRemove,
  MdEdit,
  MdInfoOutline,
  MdBlock,
} from "react-icons/md";
import {
  addMembersToGroup,
  deactivateGroup,
  editGroupInformation,
  fetchChatOrgUsers,
  fetchGroupMembers,
  jwtUserId,
  removeMembersFromGroup,
  type ChatOrgUser,
  type GroupMemberRecord,
  type GroupMembersData,
} from "@/services/chatApplication";
import ChatAvatar from "./ChatAvatar";

export type GroupManageView = "menu" | "info" | "add" | "remove" | "edit";

type GroupManagePanelProps = {
  open: boolean;
  onClose: () => void;
  orgId: string;
  groupId: string;
  initialView?: GroupManageView;
  onGroupUpdated?: (patch?: {
    group_name?: string;
    member_count?: number;
  }) => void;
};

const VIEW_TITLES: Record<GroupManageView, string> = {
  menu: "Group options",
  info: "Group info",
  add: "Add members",
  remove: "Remove members",
  edit: "Edit group",
};

export default function GroupManagePanel({
  open,
  onClose,
  orgId,
  groupId,
  initialView = "menu",
  onGroupUpdated,
}: GroupManagePanelProps) {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<GroupManageView>(initialView);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupData, setGroupData] = useState<GroupMembersData | null>(null);

  const [orgUsers, setOrgUsers] = useState<ChatOrgUser[]>([]);
  const [loadingOrgUsers, setLoadingOrgUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [selectedAddIds, setSelectedAddIds] = useState<Set<number>>(new Set());
  const [selectedRemoveIds, setSelectedRemoveIds] = useState<Set<number>>(
    new Set(),
  );

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const currentUserId = useMemo(() => {
    if (typeof window === "undefined") return null;
    return jwtUserId(localStorage.getItem("token"));
  }, [open]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadGroupMembers = useCallback(async () => {
    if (!orgId || !groupId) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Please sign in again");
      const data = await fetchGroupMembers(token, orgId, groupId);
      setGroupData(data);
      setEditName(data.group.group_name ?? "");
      setEditDescription(data.group.group_description ?? "");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load group details",
      );
    } finally {
      setLoading(false);
    }
  }, [orgId, groupId]);

  useEffect(() => {
    if (!open) return;
    setView(initialView);
    setSelectedAddIds(new Set());
    setSelectedRemoveIds(new Set());
    setUserSearch("");
    setError(null);
    void loadGroupMembers();
  }, [open, initialView, loadGroupMembers]);

  useEffect(() => {
    if (!open || view !== "add") return;
    let cancelled = false;

    async function loadUsers() {
      setLoadingOrgUsers(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Please sign in again");
        const data = await fetchChatOrgUsers(token, orgId);
        if (!cancelled) setOrgUsers(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load team members",
          );
        }
      } finally {
        if (!cancelled) setLoadingOrgUsers(false);
      }
    }

    void loadUsers();
    return () => {
      cancelled = true;
    };
  }, [open, view, orgId]);

  const existingMemberIds = useMemo(() => {
    const ids = new Set<number>();
    for (const member of groupData?.members ?? []) {
      ids.add(Number(member.id));
    }
    return ids;
  }, [groupData?.members]);

  const addableUsers = useMemo(() => {
    return orgUsers.filter(
      (user) =>
        Number(user.user_id) !== Number(currentUserId ?? -1) &&
        !existingMemberIds.has(Number(user.user_id)),
    );
  }, [orgUsers, currentUserId, existingMemberIds]);

  const filteredAddUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return addableUsers;
    return addableUsers.filter(
      (user) =>
        user.user_name.toLowerCase().includes(q) ||
        user.user_email.toLowerCase().includes(q),
    );
  }, [addableUsers, userSearch]);

  const removableMembers = useMemo(() => {
    return (groupData?.members ?? []).filter(
      (member) => !member.is_you && !member.is_admin,
    );
  }, [groupData?.members]);

  const isAdmin = Boolean(groupData?.is_current_user_admin);

  const handleClose = useCallback(() => {
    setView("menu");
    setError(null);
    onClose();
  }, [onClose]);

  const handleBack = () => {
    if (view === "menu") {
      handleClose();
      return;
    }
    setView("menu");
    setError(null);
  };

  const toggleAddUser = (userId: number) => {
    setSelectedAddIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleRemoveMember = (memberId: number) => {
    setSelectedRemoveIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const handleAddMembers = async () => {
    if (selectedAddIds.size === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Please sign in again");
      await addMembersToGroup(token, orgId, groupId, [...selectedAddIds]);
      onGroupUpdated?.({
        member_count:
          (groupData?.group.member_count ?? 0) + selectedAddIds.size,
      });
      setSelectedAddIds(new Set());
      await loadGroupMembers();
      setView("info");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add members");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMembers = async () => {
    if (selectedRemoveIds.size === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Please sign in again");
      await removeMembersFromGroup(token, orgId, groupId, [
        ...selectedRemoveIds,
      ]);
      onGroupUpdated?.({
        member_count: Math.max(
          0,
          (groupData?.group.member_count ?? 0) - selectedRemoveIds.size,
        ),
      });
      setSelectedRemoveIds(new Set());
      await loadGroupMembers();
      setView("info");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove members");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Please sign in again");
      await editGroupInformation(token, orgId, groupId, {
        group_name: editName.trim(),
        group_description: editDescription.trim(),
      });
      onGroupUpdated?.({ group_name: editName.trim() });
      await loadGroupMembers();
      setView("info");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update group");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (
      !window.confirm(
        "Deactivate this group? Members will no longer be able to send messages.",
      )
    ) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Please sign in again");
      await deactivateGroup(token, orgId, groupId);
      onGroupUpdated?.();
      handleClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to deactivate group",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10060] flex justify-end bg-black/40">
      <div
        className="flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-manage-title"
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-[#E4E7EC] bg-[#008CD3] px-3 py-3 text-white">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-white/15 text-white outline-none transition hover:bg-white/25"
            aria-label={view === "menu" ? "Close" : "Back"}
          >
            {view === "menu" ? (
              <MdClose className="text-xl" />
            ) : (
              <MdArrowBack className="text-xl" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <h2 id="group-manage-title" className="truncate text-base font-semibold">
              {VIEW_TITLES[view]}
            </h2>
            {groupData?.group.group_name ? (
              <p className="truncate text-xs text-white/80">
                {groupData.group.group_name}
              </p>
            ) : null}
          </div>
          {view === "add" && selectedAddIds.size > 0 ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleAddMembers()}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-white text-[#008CD3] outline-none transition enabled:hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Add selected members"
            >
              <MdCheck className="text-xl" />
            </button>
          ) : null}
          {view === "remove" && selectedRemoveIds.size > 0 ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleRemoveMembers()}
              className="rounded-lg border-0 bg-white px-3 py-1.5 text-sm font-medium text-[#DC2626] outline-none transition enabled:hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Removing…" : `Remove (${selectedRemoveIds.size})`}
            </button>
          ) : null}
        </header>

        {error ? (
          <p className="shrink-0 bg-[#FEF2F2] px-4 py-2 text-center text-xs text-[#DC2626]">
            {error}
          </p>
        ) : null}

        {loading && !groupData ? (
          <p className="flex flex-1 items-center justify-center text-sm text-[#6B7280]">
            Loading group…
          </p>
        ) : view === "menu" ? (
          <MenuView
            isAdmin={isAdmin}
            onSelectView={setView}
            onDeactivate={() => void handleDeactivate()}
            submitting={submitting}
          />
        ) : view === "info" ? (
          <InfoView groupData={groupData} />
        ) : view === "add" ? (
          <AddMembersView
            loading={loadingOrgUsers}
            users={filteredAddUsers}
            userSearch={userSearch}
            onSearchChange={setUserSearch}
            selectedIds={selectedAddIds}
            onToggle={toggleAddUser}
          />
        ) : view === "remove" ? (
          <RemoveMembersView
            members={removableMembers}
            selectedIds={selectedRemoveIds}
            onToggle={toggleRemoveMember}
            isAdmin={isAdmin}
          />
        ) : (
          <EditGroupView
            name={editName}
            description={editDescription}
            onNameChange={setEditName}
            onDescriptionChange={setEditDescription}
            onSave={() => void handleSaveEdit()}
            submitting={submitting}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

function MenuView({
  isAdmin,
  onSelectView,
  onDeactivate,
  submitting,
}: {
  isAdmin: boolean;
  onSelectView: (view: GroupManageView) => void;
  onDeactivate: () => void;
  submitting: boolean;
}) {
  const items: {
    view: GroupManageView;
    label: string;
    icon: React.ReactNode;
    adminOnly?: boolean;
    danger?: boolean;
  }[] = [
    {
      view: "info",
      label: "View group info",
      icon: <MdInfoOutline className="text-lg text-[#008CD3]" />,
    },
    {
      view: "add",
      label: "Add members",
      icon: <MdPersonAdd className="text-lg text-[#008CD3]" />,
      adminOnly: true,
    },
    {
      view: "remove",
      label: "Remove members",
      icon: <MdPersonRemove className="text-lg text-[#008CD3]" />,
      adminOnly: true,
    },
    {
      view: "edit",
      label: "Edit group",
      icon: <MdEdit className="text-lg text-[#008CD3]" />,
      adminOnly: true,
    },
  ];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto py-2">
      {items.map((item) => {
        if (item.adminOnly && !isAdmin) return null;
        return (
          <button
            key={item.view}
            type="button"
            onClick={() => onSelectView(item.view)}
            className="flex w-full cursor-pointer items-center gap-3 border-0 bg-white px-4 py-3.5 text-left outline-none transition hover:bg-[#F9FAFB]"
          >
            {item.icon}
            <span className="text-[15px] text-[#111827]">{item.label}</span>
          </button>
        );
      })}
      {isAdmin ? (
        <button
          type="button"
          disabled={submitting}
          onClick={onDeactivate}
          className="flex w-full cursor-pointer items-center gap-3 border-0 border-t border-[#F3F4F6] bg-white px-4 py-3.5 text-left outline-none transition hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <MdBlock className="text-lg text-[#DC2626]" />
          <span className="text-[15px] text-[#DC2626]">Deactivate group</span>
        </button>
      ) : null}
    </div>
  );
}

function InfoView({ groupData }: { groupData: GroupMembersData | null }) {
  if (!groupData) return null;

  const { group, members } = groupData;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col items-center border-b border-[#E4E7EC] bg-[#F9FAFB] px-4 py-6">
        <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-[#008CD3]/10 text-[#008CD3]">
          {group.group_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={group.group_image}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <MdGroups className="text-4xl" />
          )}
        </div>
        <h3 className="text-center text-lg font-semibold text-[#111827]">
          {group.group_name}
        </h3>
        {group.group_description ? (
          <p className="mt-1 max-w-sm text-center text-sm text-[#6B7280]">
            {group.group_description}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-[#9CA3AF]">
          {group.member_count} members
        </p>
      </div>

      <div className="px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
          Members
        </p>
        {members.map((member) => (
          <MemberRow key={member.id} member={member} />
        ))}
      </div>
    </div>
  );
}

function MemberRow({ member }: { member: GroupMemberRecord }) {
  return (
    <div className="flex items-center gap-3 border-b border-[#F3F4F6] py-3 last:border-0">
      <ChatAvatar
        name={member.name}
        imageUrl={member.profile_picture}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-[#111827]">
          {member.name}
          {member.is_you ? (
            <span className="ml-1 text-xs font-normal text-[#6B7280]">(You)</span>
          ) : null}
        </p>
        <p className="truncate text-[13px] text-[#6B7280]">{member.email}</p>
      </div>
      {member.is_admin ? (
        <span className="shrink-0 rounded-full bg-[#E0F2FE] px-2 py-0.5 text-[10px] font-medium text-[#008CD3]">
          Admin
        </span>
      ) : null}
    </div>
  );
}

function AddMembersView({
  loading,
  users,
  userSearch,
  onSearchChange,
  selectedIds,
  onToggle,
}: {
  loading: boolean;
  users: ChatOrgUser[];
  userSearch: string;
  onSearchChange: (value: string) => void;
  selectedIds: Set<number>;
  onToggle: (userId: number) => void;
}) {
  return (
    <>
      <div className="shrink-0 border-b border-[#E4E7EC] px-3 py-2.5">
        <label className="relative block">
          <span className="sr-only">Search members</span>
          <MdOutlineSearch
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-[#9CA3AF]"
            aria-hidden
          />
          <input
            type="search"
            value={userSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name or email"
            className="w-full rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#008CD3] focus:bg-white focus:ring-2 focus:ring-[#008CD3]/15"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-[#6B7280]">
            Loading team members…
          </p>
        ) : users.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[#6B7280]">
            No members available to add
          </p>
        ) : (
          users.map((user) => {
            const id = Number(user.user_id);
            const checked = selectedIds.has(id);
            return (
              <button
                key={user.user_id}
                type="button"
                onClick={() => onToggle(id)}
                className="flex w-full cursor-pointer items-center gap-3 border-0 border-b border-[#F3F4F6] bg-white px-4 py-3 text-left outline-none transition hover:bg-[#F9FAFB]"
              >
                <ChatAvatar
                  name={user.user_name}
                  imageUrl={user.user_profile}
                  size="sm"
                  interactive={false}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-[#111827]">
                    {user.user_name}
                  </p>
                  <p className="truncate text-[13px] text-[#6B7280]">
                    {user.user_email}
                  </p>
                </div>
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                    checked
                      ? "border-[#008CD3] bg-[#008CD3] text-white"
                      : "border-[#D1D5DB] bg-white"
                  }`}
                >
                  {checked ? <MdCheck className="text-sm" /> : null}
                </span>
              </button>
            );
          })
        )}
      </div>
    </>
  );
}

function RemoveMembersView({
  members,
  selectedIds,
  onToggle,
  isAdmin,
}: {
  members: GroupMemberRecord[];
  selectedIds: Set<number>;
  onToggle: (memberId: number) => void;
  isAdmin: boolean;
}) {
  if (!isAdmin) {
    return (
      <p className="px-4 py-8 text-center text-sm text-[#6B7280]">
        Only group admins can remove members.
      </p>
    );
  }

  if (members.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-[#6B7280]">
        No removable members. Admins and yourself cannot be removed here.
      </p>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <p className="border-b border-[#E4E7EC] bg-[#F9FAFB] px-4 py-2 text-xs text-[#6B7280]">
        Select members to remove from the group
      </p>
      {members.map((member) => {
        const checked = selectedIds.has(member.id);
        return (
          <button
            key={member.id}
            type="button"
            onClick={() => onToggle(member.id)}
            className="flex w-full cursor-pointer items-center gap-3 border-0 border-b border-[#F3F4F6] bg-white px-4 py-3 text-left outline-none transition hover:bg-[#F9FAFB]"
          >
            <ChatAvatar
              name={member.name}
              imageUrl={member.profile_picture}
              size="sm"
              interactive={false}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium text-[#111827]">
                {member.name}
              </p>
              <p className="truncate text-[13px] text-[#6B7280]">
                {member.email}
              </p>
            </div>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                checked
                  ? "border-[#DC2626] bg-[#DC2626] text-white"
                  : "border-[#D1D5DB] bg-white"
              }`}
            >
              {checked ? <MdCheck className="text-sm" /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function EditGroupView({
  name,
  description,
  onNameChange,
  onDescriptionChange,
  onSave,
  submitting,
}: {
  name: string;
  description: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSave: () => void;
  submitting: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium text-[#374151]">
          Group name
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15"
          placeholder="Group name"
        />
      </label>
      <label className="mb-6 block">
        <span className="mb-1 block text-sm font-medium text-[#374151]">
          Description
        </span>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15"
          placeholder="What's this group about?"
        />
      </label>
      <button
        type="button"
        disabled={!name.trim() || submitting}
        onClick={onSave}
        className="cursor-pointer rounded-lg border-0 bg-[#008CD3] px-4 py-2.5 text-sm font-medium text-white outline-none transition hover:bg-[#007AB8] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
