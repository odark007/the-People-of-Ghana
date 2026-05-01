"use client";

import { useState, useEffect, useCallback } from "react";
import { ANONYMITY_CONFIGS } from "@/types";
import type { AnonymityLevel, UserRole } from "@/types";

const ROLE_BADGE: Record<UserRole, { label: string; cls: string }> = {
  user:       { label: "User",       cls: "badge-gray" },
  admin:      { label: "Admin",      cls: "badge-gold" },
  superadmin: { label: "Superadmin", cls: "badge-red"  },
};

const ANON_ICONS: Record<AnonymityLevel, string> = {
  L1: "🕶️", L2: "🎭", L3: "🙋",
};

export default function AdminUsersClient() {
  const [users,      setUsers]      = useState<any[]>([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [isLoading,  setIsLoading]  = useState(true);
  const [roleFilter, setRoleFilter] = useState("");
  const [selected,   setSelected]   = useState<any | null>(null);
  const [newRole,    setNewRole]    = useState<UserRole>("user");
  const [isSaving,   setIsSaving]   = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMsg,  setActionMsg]  = useState("");
  const LIMIT = 20;

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams({
      page:  String(page),
      limit: String(LIMIT),
    });
    if (roleFilter) params.set("role", roleFilter);
    const res  = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setUsers(data.data?.users ?? []);
    setTotal(data.data?.total ?? 0);
    setIsLoading(false);
  }, [page, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function updateRole() {
    if (!selected) return;
    setIsSaving(true);
    setActionMsg("");
    const res  = await fetch(`/api/admin/users/${selected.id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ role: newRole }),
    });
    const data = await res.json();
    setIsSaving(false);
    if (!res.ok) {
      setActionMsg(data.error?.message ?? "Failed to update role.");
      return;
    }
    setActionMsg(`✓ Role updated to ${newRole}`);
    fetchUsers();
  }

  async function deleteUser(id: string) {
    if (!confirm(
      "Soft-delete this user? Their reports remain but their identity is erased. This cannot be undone."
    )) return;
    setIsDeleting(true);
    setActionMsg("");
    const res  = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const data = await res.json();
    setIsDeleting(false);
    if (!res.ok) {
      setActionMsg(data.error?.message ?? "Failed to delete.");
      return;
    }
    setSelected(null);
    fetchUsers();
  }

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold">Users & RBAC</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {total.toLocaleString()} registered · Superadmin only
          </p>
        </div>
      </div>

      {/* RBAC info card */}
      <div className="card p-4 mb-5 border-l-4 border-l-ghana-gold">
        <p className="text-xs font-bold text-ghana-black uppercase tracking-wider mb-2">
          Role Permissions
        </p>
        <div className="grid grid-cols-3 gap-3 text-xs">
          {[
            {
              role:  "user",
              label: "User",
              perms: "Submit reports · Post in feed · Browse directory",
            },
            {
              role:  "admin",
              label: "Admin",
              perms: "All user perms · Moderate queue · Manage officials · View all reports",
            },
            {
              role:  "superadmin",
              label: "Superadmin",
              perms: "All admin perms · Manage users · RBAC · Storage manager · Erasure",
            },
          ].map(({ role, label, perms }) => (
            <div key={role} className="bg-[var(--surface-2)] rounded-xl p-3">
              <span className={`badge text-[10px] mb-2 block w-fit ${ROLE_BADGE[role as UserRole].cls}`}>
                {label}
              </span>
              <p className="text-[var(--text-muted)] leading-relaxed">{perms}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="card p-4 mb-4 flex gap-3 items-center">
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="input w-auto py-2"
        >
          <option value="">All roles</option>
          <option value="user">Users only</option>
          <option value="admin">Admins only</option>
          <option value="superadmin">Superadmins only</option>
        </select>
        <span className="text-sm text-[var(--text-muted)]">{total} results</span>
      </div>

      {/* User list */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-ghana-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--text-muted)]">
            No users found
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {users.map((u) => {
              const roleBadge = ROLE_BADGE[u.role as UserRole];
              const isDeleted = !!u.deleted_at;
              return (
                <div
                  key={u.id}
                  onClick={() => {
                    if (!isDeleted) {
                      setSelected(u);
                      setNewRole(u.role);
                      setActionMsg("");
                    }
                  }}
                  className={`flex items-center gap-3 px-5 py-3.5 transition-colors
                    ${isDeleted
                      ? "opacity-40"
                      : "hover:bg-[var(--surface-2)] cursor-pointer"}`}
                >
                  <div className="w-9 h-9 rounded-full bg-[var(--surface-2)] border border-[var(--border)]
                                  flex items-center justify-center text-base flex-shrink-0">
                    {ANON_ICONS[u.anonymity_level as AnonymityLevel]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{u.public_name}</p>
                      {isDeleted && (
                        <span className="text-[10px] badge badge-gray">Deleted</span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-subtle)] truncate">
                      {u.email} ·{" "}
                      {ANONYMITY_CONFIGS[u.anonymity_level as AnonymityLevel]?.label} ·{" "}
                      Joined{" "}
                      {new Date(u.created_at).toLocaleDateString("en-GH", {
                        month: "short", year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className={`badge text-[10px] flex-shrink-0 ${roleBadge.cls}`}>
                    {roleBadge.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-outline py-1.5 px-4 text-sm disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-[var(--text-muted)]">
            Page {page} of {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="btn-outline py-1.5 px-4 text-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}

      {/* User detail / RBAC panel */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center
                     justify-center backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white w-full max-w-md rounded-t-3xl md:rounded-2xl p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">Manage User</h2>
              <button
                onClick={() => setSelected(null)}
                className="text-[var(--text-subtle)] hover:text-black"
              >
                ✕
              </button>
            </div>

            {/* User info */}
            <div className="bg-[var(--surface-2)] rounded-xl p-4 mb-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-white border border-[var(--border)]
                                flex items-center justify-center text-xl">
                  {ANON_ICONS[selected.anonymity_level as AnonymityLevel]}
                </div>
                <div>
                  <p className="font-bold text-sm">{selected.public_name}</p>
                  <p className="text-xs text-[var(--text-subtle)]">{selected.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  {
                    label: "Anonymity",
                    value: ANONYMITY_CONFIGS[selected.anonymity_level as AnonymityLevel]?.label,
                  },
                  { label: "Current role", value: selected.role },
                  { label: "Verified",     value: selected.is_verified ? "Yes" : "No" },
                  {
                    label: "Joined",
                    value: new Date(selected.created_at).toLocaleDateString("en-GH"),
                  },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[var(--text-subtle)] font-semibold uppercase
                                  tracking-wide text-[10px]">
                      {label}
                    </p>
                    <p className="font-medium mt-0.5 capitalize">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* RBAC — Change role */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-[var(--text-muted)]
                               uppercase tracking-wider mb-2">
                Assign Role
              </label>
              <div className="flex flex-col gap-2">
                {(["user","admin","superadmin"] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setNewRole(r)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left
                                transition-all
                                ${newRole === r
                                  ? "border-ghana-black bg-[var(--surface-2)]"
                                  : "border-[var(--border)] hover:border-[var(--border-2)]"}`}
                  >
                    <span className={`badge text-[10px] ${ROLE_BADGE[r].cls}`}>
                      {ROLE_BADGE[r].label}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] flex-1">
                      {r === "user"       && "Standard access — report, post, browse"}
                      {r === "admin"      && "Moderate content, manage officials"}
                      {r === "superadmin" && "Full access — users, storage, RBAC"}
                    </span>
                    {newRole === r && (
                      <span className="text-xs text-ghana-black font-bold">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {actionMsg && (
              <p className={`text-sm mb-3 ${
                actionMsg.startsWith("✓") ? "text-ghana-green" : "text-ghana-red"
              }`}>
                {actionMsg}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => deleteUser(selected.id)}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl border-2 border-ghana-red/30 text-ghana-red
                           text-sm font-semibold hover:bg-ghana-red/5 transition-colors
                           disabled:opacity-40"
              >
                {isDeleting ? "Erasing…" : "🗑️ Erase User"}
              </button>
              <button
                onClick={updateRole}
                disabled={isSaving || newRole === selected.role}
                className="btn-secondary flex-1 py-3 disabled:opacity-40"
              >
                {isSaving ? "Saving…" : "Save Role"}
              </button>
            </div>

            <p className="text-[10px] text-[var(--text-subtle)] text-center mt-3 leading-relaxed">
              Erasure is a soft delete — reports remain as civic records attributed to
              "Deleted Citizen". The user's login is disabled permanently.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}