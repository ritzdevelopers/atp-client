"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  MdArrowBack,
  MdCheck,
  MdClose,
  MdGroups,
  MdOutlineSearch,
} from "react-icons/md";
import {
  createChatGroup,
  fetchChatOrgUsers,
  jwtUserId,
  type ChatOrgUser,
} from "@/services/chatApplication";
import { getAvatarColor, getInitials } from "./dummyData";

type Step = "select" | "details";

type CreateGroupModalProps = {
  open: boolean;
  onClose: () => void;
  orgId: string;
  onCreated: () => void;
};

export default function CreateGroupModal({
  open,
  onClose,
  orgId,
  onCreated,
}: CreateGroupModalProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("select");
  const [users, setUsers] = useState<ChatOrgUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = useMemo(() => {
    if (typeof window === "undefined") return null;
    return jwtUserId(localStorage.getItem("token"));
  }, [open]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const resetState = useCallback(() => {
    setStep("select");
    setUserSearch("");
    setSelectedIds(new Set());
    setGroupName("");
    setGroupDescription("");
    setError(null);
    setSubmitting(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  useEffect(() => {
    if (!open || !orgId) return;
    let cancelled = false;

    async function loadUsers() {
      setLoadingUsers(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Please sign in again");
        const data = await fetchChatOrgUsers(token, orgId);
        if (!cancelled) setUsers(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load team members",
          );
        }
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    }

    void loadUsers();
    return () => {
      cancelled = true;
    };
  }, [open, orgId]);

  const selectableUsers = useMemo(
    () =>
      users.filter((u) => Number(u.user_id) !== Number(currentUserId ?? -1)),
    [users, currentUserId],
  );

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return selectableUsers;
    return selectableUsers.filter(
      (u) =>
        u.user_name.toLowerCase().includes(q) ||
        u.user_email.toLowerCase().includes(q),
    );
  }, [selectableUsers, userSearch]);

  const selectedUsers = useMemo(
    () => selectableUsers.filter((u) => selectedIds.has(Number(u.user_id))),
    [selectableUsers, selectedIds],
  );

  const toggleUser = (userId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const canProceed = selectedIds.size > 0;
  const canCreate = groupName.trim().length > 0 && !submitting;

  const handleCreate = async () => {
    if (!currentUserId || !canCreate) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Please sign in again");

      const participantIds = [
        currentUserId,
        ...Array.from(selectedIds),
      ];

      await createChatGroup(token, orgId, {
        group_name: groupName.trim(),
        group_description: groupDescription.trim(),
        group_image: "",
        group_admins: [currentUserId],
        participants: participantIds,
      });

      onCreated();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group");
      setSubmitting(false);
    }
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10070] flex items-stretch justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div
        className="flex h-full w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl sm:h-[min(640px,90vh)] sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-group-title"
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-[#E4E7EC] bg-[#008CD3] px-3 py-3 text-white sm:px-4">
          <button
            type="button"
            onClick={() => (step === "details" ? setStep("select") : handleClose())}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-white/15 text-white outline-none transition hover:bg-white/25"
            aria-label={step === "details" ? "Back to member selection" : "Close"}
          >
            {step === "details" ? (
              <MdArrowBack className="text-xl" />
            ) : (
              <MdClose className="text-xl" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <h2 id="create-group-title" className="truncate text-base font-semibold">
              {step === "select" ? "Add group members" : "New group"}
            </h2>
            <p className="truncate text-xs text-white/80">
              {step === "select"
                ? selectedIds.size > 0
                  ? `${selectedIds.size} selected`
                  : "Select team members to add"
                : "Enter group name and create"}
            </p>
          </div>
          {step === "select" && (
            <button
              type="button"
              disabled={!canProceed}
              onClick={() => setStep("details")}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-white text-[#008CD3] outline-none transition enabled:hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Continue to group details"
            >
              <MdCheck className="text-xl" />
            </button>
          )}
        </header>

        {step === "select" && selectedUsers.length > 0 && (
          <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2.5 [scrollbar-width:thin]">
            {selectedUsers.map((user) => (
              <button
                key={user.user_id}
                type="button"
                onClick={() => toggleUser(Number(user.user_id))}
                className="flex shrink-0 cursor-pointer flex-col items-center gap-1 border-0 bg-transparent p-0 outline-none"
                title={`Remove ${user.user_name}`}
              >
                <UserAvatar user={user} size="sm" />
                <span className="max-w-[56px] truncate text-[10px] text-[#374151]">
                  {user.user_name.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        )}

        {step === "select" ? (
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
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search name or email"
                  className="w-full rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#008CD3] focus:bg-white focus:ring-2 focus:ring-[#008CD3]/15"
                />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loadingUsers ? (
                <p className="px-4 py-8 text-center text-sm text-[#6B7280]">
                  Loading team members…
                </p>
              ) : filteredUsers.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[#6B7280]">
                  No members match your search
                </p>
              ) : (
                filteredUsers.map((user) => {
                  const id = Number(user.user_id);
                  const checked = selectedIds.has(id);
                  return (
                    <button
                      key={user.user_id}
                      type="button"
                      onClick={() => toggleUser(id)}
                      className="flex w-full cursor-pointer items-center gap-3 border-0 border-b border-[#F3F4F6] bg-white px-4 py-3 text-left outline-none transition hover:bg-[#F9FAFB]"
                    >
                      <UserAvatar user={user} />
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
                        aria-hidden
                      >
                        {checked ? <MdCheck className="text-sm" /> : null}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            <div className="mb-6 flex flex-col items-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#E8F4FB] text-[#008CD3]">
                <MdGroups className="text-4xl" aria-hidden />
              </span>
              <p className="mt-3 text-center text-sm text-[#6B7280]">
                {selectedIds.size + 1} members · You are the group admin
              </p>
            </div>

            <label className="mb-4 block">
              <span className="mb-1.5 block text-sm font-medium text-[#374151]">
                Group name <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Engineering Team"
                maxLength={80}
                className="w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[#374151]">
                Description <span className="text-[#9CA3AF]">(optional)</span>
              </span>
              <textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="What is this group about?"
                rows={3}
                maxLength={250}
                className="w-full resize-none rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#008CD3] focus:ring-2 focus:ring-[#008CD3]/15"
              />
            </label>

            <div className="mt-5 rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                Members
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <span
                    key={user.user_id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs text-[#374151] ring-1 ring-[#E4E7EC]"
                  >
                    <UserAvatar user={user} size="xs" />
                    {user.user_name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="shrink-0 border-t border-red-100 bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {step === "details" && (
          <footer className="shrink-0 border-t border-[#E4E7EC] bg-white p-4">
            <button
              type="button"
              disabled={!canCreate}
              onClick={() => void handleCreate()}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-[#008CD3] px-4 py-3 text-sm font-semibold text-white outline-none transition hover:bg-[#0070AA] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating group…" : "Create group"}
            </button>
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

function UserAvatar({
  user,
  size = "md",
}: {
  user: ChatOrgUser;
  size?: "xs" | "sm" | "md";
}) {
  const sizeClass =
    size === "xs"
      ? "h-6 w-6 text-[9px]"
      : size === "sm"
        ? "h-10 w-10 text-xs"
        : "h-12 w-12 text-sm";

  if (user.user_profile) {
    return (
      <img
        src={user.user_profile}
        alt=""
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}
      style={{ backgroundColor: getAvatarColor(user.user_name) }}
    >
      {getInitials(user.user_name)}
    </span>
  );
}
