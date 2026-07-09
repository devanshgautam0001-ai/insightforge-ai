/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  UserCheck,
  Shield,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Clock,
  UserMinus,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Cpu
} from "lucide-react";
import { User, UserRole } from "../types";
import { Language, translations } from "../lib/translations";

interface UserManagementProps {
  currentUser: User;
  lang: Language;
}

interface DBUser {
  uid: string;
  email: string;
  name: string | null;
  role: string;
  company: string | null;
  designation: string | null;
  country: string | null;
  createdAt: string;
  active?: boolean;
}

export default function UserManagement({ currentUser, lang }: UserManagementProps) {
  const t = translations[lang];
  const [usersList, setUsersList] = useState<DBUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [loading, setLoading] = useState(false);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setUsersList(data);
        }
      } else {
        let errorMsg = "Failed to retrieve user directory.";
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            errorMsg = data.error || errorMsg;
          }
        } catch (e) {}
        setErrorMsg(errorMsg);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error trying to fetch user accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (targetUid: string, newRole: UserRole) => {
    if (targetUid === currentUser.id) {
      setErrorMsg("You cannot modify your own administrative rights.");
      return;
    }

    setUpdatingUid(targetUid);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch(`/api/admin/users/${targetUid}/role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setSuccessMsg(`User role successfully updated to ${newRole}.`);
          setUsersList(prev =>
            prev.map(u => (u.uid === targetUid ? { ...u, role: newRole } : u))
          );
        } else {
          setSuccessMsg(`User role successfully updated to ${newRole}.`);
        }
      } else {
        let errorMsg = "Failed to update user role.";
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            errorMsg = data.error || errorMsg;
          }
        } catch (e) {}
        setErrorMsg(errorMsg);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error occurred during role transition.");
    } finally {
      setUpdatingUid(null);
    }
  };

  const handleDeactivate = async (targetUid: string) => {
    setUpdatingUid(targetUid);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch(`/api/admin/users/${targetUid}/deactivate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSuccessMsg(`User status updated successfully.`);
        setUsersList(prev =>
          prev.map(u => (u.uid === targetUid ? { ...u, active: data.active } : u))
        );
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "Failed to toggle user status.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error trying to toggle user status.");
    } finally {
      setUpdatingUid(null);
    }
  };

  const handleDelete = async (targetUid: string) => {
    if (!window.confirm("Are you absolutely sure you want to permanently delete this user account from the registry? This action is irreversible.")) {
      return;
    }

    setUpdatingUid(targetUid);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch(`/api/admin/users/${targetUid}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        setSuccessMsg(`User successfully purged from system registry.`);
        setUsersList(prev => prev.filter(u => u.uid !== targetUid));
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "Failed to delete user.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error trying to purge user account.");
    } finally {
      setUpdatingUid(null);
    }
  };

  // Filter & Search
  const filteredUsers = usersList.filter(u => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "All" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeClass = (role: string) => {
    switch (role?.toUpperCase()) {
      case "SUPER_ADMIN":
        return "bg-red-500/10 border-red-500/30 text-red-500";
      case "ADMIN":
        return "bg-amber-500/10 border-amber-500/30 text-amber-500";
      case "ANALYST":
        return "bg-blue-500/10 border-blue-500/30 text-blue-400";
      default:
        return "bg-zinc-500/10 border-zinc-800 text-zinc-400";
    }
  };

  return (
    <div className="space-y-6 max-h-[calc(100vh-100px)] overflow-y-auto p-1 pr-2">
      {/* Title */}
      <div className="bg-bg-surface rounded border border-border-hairline p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-sm font-display font-bold text-text-primary flex items-center gap-2 uppercase tracking-wide">
            <Users className="w-5 h-5 text-accent-signal" />
            Enterprise User Management & RBAC Directory
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Review user authorization metrics, manage administrator and analyst tiers, and enforce role-based boundaries.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="bg-bg-void hover:bg-bg-surface-raised text-text-primary text-[10px] font-mono font-bold uppercase tracking-wider px-3.5 py-1.5 rounded border border-border-hairline transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Registry
        </button>
      </div>

      {/* Role Distribution KPI Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-bg-surface p-4 border border-border-hairline rounded">
          <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-text-muted block">TOTAL USERS</span>
          <p className="text-2xl font-mono font-bold text-text-primary mt-1">{usersList.length}</p>
        </div>
        <div className="bg-bg-surface p-4 border border-border-hairline rounded">
          <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-red-500 block">SUPER ADMINS</span>
          <p className="text-2xl font-mono font-bold text-red-500 mt-1">
            {usersList.filter(u => u.role?.toUpperCase() === "SUPER_ADMIN").length}
          </p>
        </div>
        <div className="bg-bg-surface p-4 border border-border-hairline rounded">
          <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-amber-500 block">ADMINISTRATORS</span>
          <p className="text-2xl font-mono font-bold text-amber-500 mt-1">
            {usersList.filter(u => u.role?.toUpperCase() === "ADMIN").length}
          </p>
        </div>
        <div className="bg-bg-surface p-4 border border-border-hairline rounded">
          <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-blue-400 block">ANALYSTS</span>
          <p className="text-2xl font-mono font-bold text-blue-400 mt-1">
            {usersList.filter(u => u.role?.toUpperCase() === "ANALYST").length}
          </p>
        </div>
        <div className="bg-bg-surface p-4 border border-border-hairline rounded">
          <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-zinc-400 block">VIEWERS</span>
          <p className="text-2xl font-mono font-bold text-zinc-400 mt-1">
            {usersList.filter(u => u.role?.toUpperCase() === "VIEWER" || !u.role).length}
          </p>
        </div>
      </div>

      {/* Main filter & table grid */}
      <div className="bg-bg-surface rounded border border-border-hairline p-5 space-y-4">
        {/* Search & Filter Header bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-border-hairline pb-4">
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-bg-void border border-border-hairline text-xs rounded pl-9 pr-4 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-signal"
            />
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-[10px] font-mono text-text-secondary uppercase">Role Filter:</span>
            <div className="flex bg-bg-void p-0.5 rounded border border-border-hairline">
              {["All", "SUPER_ADMIN", "ADMIN", "ANALYST", "VIEWER"].map(role => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-3 py-1 rounded text-[10px] font-mono font-bold uppercase transition ${
                    roleFilter === role
                      ? "bg-accent-signal text-bg-void font-extrabold"
                      : "text-text-muted hover:text-text-secondary cursor-pointer"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications and messages feedback */}
        {successMsg && (
          <div className="bg-accent-positive/10 border border-accent-positive/20 text-accent-positive rounded p-3.5 flex items-center gap-2 text-xs font-mono">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg.toUpperCase()}</span>
          </div>
        )}
        {errorMsg && (
          <div className="bg-accent-negative/10 border border-accent-negative/20 text-accent-negative rounded p-3.5 flex items-center gap-2 text-xs font-mono">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg.toUpperCase()}</span>
          </div>
        )}

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="border-b border-border-hairline text-text-secondary font-mono text-[10px] uppercase tracking-widest">
                <th className="py-3 px-4 font-bold">User / Contact Details</th>
                <th className="py-3 px-4 font-bold">Security Group</th>
                <th className="py-3 px-4 font-bold">Workspace Role Actions</th>
                <th className="py-3 px-4 font-bold">Onboard Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline/40 text-xs">
              {filteredUsers.map(user => {
                const isSelf = user.uid === currentUser.id || user.uid === (currentUser as any).uid;
                const callerRole = currentUser.role?.toUpperCase();
                const targetRole = user.role?.toUpperCase();

                return (
                  <tr key={user.uid} className="hover:bg-bg-void/40 transition duration-150">
                    <td className="py-4 px-4">
                      <div className="font-mono font-bold text-text-primary text-[13px]">
                        {user.name || "UNNAMED OPERATOR"}
                        {isSelf && (
                          <span className="ml-2 text-[8px] bg-accent-signal/15 border border-accent-signal/30 text-accent-signal px-1.5 py-0.2 rounded font-bold uppercase">
                            YOU
                          </span>
                        )}
                        {user.active === false && (
                          <span className="ml-2 text-[8px] bg-red-500/10 border border-red-500/30 text-red-400 px-1.5 py-0.2 rounded font-bold uppercase">
                            DEACTIVATED
                          </span>
                        )}
                      </div>
                      <div className="text-text-secondary text-[11px] mt-0.5">{user.email}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-block px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest rounded border ${getRoleBadgeClass(user.role)}`}>
                        {user.role || "VIEWER"}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {isSelf ? (
                        <span className="text-[10px] text-text-muted font-mono leading-relaxed italic">
                          Protected workspace profile
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          {callerRole === "SUPER_ADMIN" ? (
                            <>
                              {targetRole === "SUPER_ADMIN" && (
                                <span className="text-[10px] text-text-muted font-mono italic font-bold">Protected Super Admin</span>
                              )}

                              {targetRole === "ADMIN" && (
                                <button
                                  onClick={() => handleRoleChange(user.uid, "ANALYST")}
                                  disabled={updatingUid !== null}
                                  className="bg-red-500/10 border border-red-500/20 hover:bg-red-500 text-red-400 hover:text-white px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider rounded transition cursor-pointer"
                                >
                                  Demote to Analyst
                                </button>
                              )}

                              {targetRole === "ANALYST" && (
                                <>
                                  <button
                                    onClick={() => handleRoleChange(user.uid, "ADMIN")}
                                    disabled={updatingUid !== null}
                                    className="bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500 text-amber-500 hover:text-black px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider rounded transition cursor-pointer"
                                  >
                                    Promote to Admin
                                  </button>
                                  <button
                                    onClick={() => handleRoleChange(user.uid, "VIEWER")}
                                    disabled={updatingUid !== null}
                                    className="bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider rounded transition cursor-pointer"
                                  >
                                    Demote to Viewer
                                  </button>
                                </>
                              )}

                              {(targetRole === "VIEWER" || !targetRole) && (
                                <button
                                  onClick={() => handleRoleChange(user.uid, "ANALYST")}
                                  disabled={updatingUid !== null}
                                  className="bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider rounded transition cursor-pointer"
                                >
                                  Promote to Analyst
                                </button>
                              )}

                              {/* Deactivate / Activate Toggle */}
                              {user.active !== false ? (
                                <button
                                  onClick={() => handleDeactivate(user.uid)}
                                  disabled={updatingUid !== null}
                                  className="bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500 text-orange-400 hover:text-white px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider rounded transition cursor-pointer"
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDeactivate(user.uid)}
                                  disabled={updatingUid !== null}
                                  className="bg-green-500/10 border border-green-500/20 hover:bg-green-500 text-green-400 hover:text-white px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider rounded transition cursor-pointer"
                                >
                                  Activate
                                </button>
                              )}

                              {/* Delete operator button */}
                              <button
                                onClick={() => handleDelete(user.uid)}
                                disabled={updatingUid !== null}
                                className="bg-red-600/20 border border-red-600/30 hover:bg-red-600 text-red-500 hover:text-white px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider rounded transition cursor-pointer"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-text-muted font-mono italic">
                              View-only access
                            </span>
                          )}

                          {updatingUid === user.uid && (
                            <RefreshCw className="w-3.5 h-3.5 text-accent-signal animate-spin shrink-0" />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-text-secondary font-mono text-[11px]">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-text-muted font-mono uppercase tracking-widest text-[10px]">
                    {loading ? "Searching encrypted registries..." : "No users matched filtration parameters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
