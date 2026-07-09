/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Bell,
  Check,
  CheckCircle,
  AlertCircle,
  Info,
  Clock,
  Trash2,
  RefreshCw,
  Plus,
  Sliders,
  Sparkles
} from "lucide-react";
import { User } from "../types";

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  read: boolean;
  createdAt: string;
}

interface NotificationCenterProps {
  user: User;
  lang: string;
}

export default function NotificationCenter({ user, lang }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "UNREAD" | "READ">("ALL");

  // Load notifications from Backend API
  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch("/api/notifications", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        // Hydrate backend notification times properly
        const formatted = data.map((n: any) => ({
          ...n,
          createdAt: n.createdAt?.seconds 
            ? new Date(n.createdAt.seconds * 1000).toISOString()
            : n.createdAt
        }));
        setNotifications(formatted);
      }
    } catch (err) {
      console.error("Failed to load notifications from secure API:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem("auth_token") || "";
      // Optimistic update
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    try {
      const token = localStorage.getItem("auth_token") || "";
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      
      await Promise.all(
        unread.map(n =>
          fetch(`/api/notifications/${n.id}/read`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
        )
      );
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  // Highly Interactive: Inject a simulated test notification in DB or locally to allow instantaneous end-to-end user evaluation!
  const triggerSimulatedNotification = async (type: "INFO" | "SUCCESS" | "WARNING" | "ERROR") => {
    // Generate a beautiful mock system alert
    const titles = {
      INFO: "Telemetry Sync Triggered",
      SUCCESS: "AutoML Invariant Converged",
      WARNING: "Peak Memory Bounds Threshold exceeded",
      ERROR: "Pipeline Execution Interrupted"
    };
    const messages = {
      INFO: "ML analytics telemetry payload synthesized with 100% resolution.",
      SUCCESS: "Deep Ensemble Random Forest reached 98.4% Accuracy index.",
      WARNING: "Server container utilization crossed 85% on threadpool #14.",
      ERROR: "Ingestion buffer mismatch on column row indices. Check schema limits."
    };

    const newNotif: SystemNotification = {
      id: Math.random().toString(36).substring(2, 11),
      title: titles[type],
      message: messages[type],
      type,
      read: false,
      createdAt: new Date().toISOString()
    };

    // Prepend to display and let user test immediately!
    setNotifications(prev => [newNotif, ...prev]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "SUCCESS":
        return <CheckCircle className="w-4 h-4 text-accent-positive" />;
      case "WARNING":
        return <AlertCircle className="w-4 h-4 text-[#F5B942]" />;
      case "ERROR":
        return <AlertCircle className="w-4 h-4 text-accent-negative" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "SUCCESS":
        return "bg-accent-positive/10 border-accent-positive/20 text-accent-positive";
      case "WARNING":
        return "bg-[#F5B942]/10 border-[#F5B942]/20 text-[#F5B942]";
      case "ERROR":
        return "bg-accent-negative/10 border-accent-negative/20 text-accent-negative";
      default:
        return "bg-blue-500/10 border-blue-500/20 text-blue-400";
    }
  };

  const filteredNotifs = notifications.filter(n => {
    const matchType = filterType === "ALL" || n.type === filterType;
    const matchStatus =
      filterStatus === "ALL" ||
      (filterStatus === "UNREAD" && !n.read) ||
      (filterStatus === "READ" && n.read);
    return matchType && matchStatus;
  });

  return (
    <div className="space-y-6 max-h-[calc(100vh-100px)] overflow-y-auto p-1 pr-2">
      {/* Title */}
      <div className="bg-bg-surface rounded border border-border-hairline p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-sm font-display font-bold text-text-primary flex items-center gap-2 uppercase tracking-wide">
            <Bell className="w-5 h-5 text-accent-signal" />
            System Notification Center
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Review predictive pipeline logs, training milestones, and security warnings.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchNotifications}
            className="bg-bg-void hover:bg-bg-surface border border-border-hairline text-text-secondary hover:text-text-primary font-mono font-bold text-[10px] tracking-wider py-1.5 px-3 rounded flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            REFRESH FEED
          </button>
          <button
            onClick={handleMarkAllRead}
            disabled={notifications.filter(n => !n.read).length === 0}
            className="bg-accent-signal hover:bg-accent-signal/90 disabled:bg-bg-void disabled:text-text-muted text-bg-void font-mono font-bold text-[10px] tracking-wider uppercase py-1.5 px-3.5 rounded-[4px] border border-accent-signal/20 flex items-center gap-1.5 transition cursor-pointer shadow-none"
          >
            <Check className="w-3.5 h-3.5" />
            MARK ALL READ
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Interactive Simulator & Filter Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Invariant Filter parameters */}
          <div className="bg-bg-surface rounded border border-border-hairline p-5 space-y-5">
            <h3 className="text-xs font-mono font-bold text-text-primary flex items-center gap-1.5 border-b border-border-hairline pb-3 uppercase tracking-widest">
              <Sliders className="w-4 h-4 text-accent-signal" />
              Feed Filters
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[9px] text-text-muted font-mono font-bold uppercase tracking-widest mb-1.5">
                  Severity Levels
                </label>
                <div className="space-y-1.5">
                  {["ALL", "SUCCESS", "INFO", "WARNING", "ERROR"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`w-full text-left font-mono text-[10px] uppercase font-bold py-1.5 px-2.5 rounded transition ${
                        filterType === type
                          ? "bg-accent-signal text-bg-void"
                          : "text-text-secondary hover:bg-bg-void hover:text-text-primary"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[9px] text-text-muted font-mono font-bold uppercase tracking-widest mb-1.5">
                  Status
                </label>
                <div className="grid grid-cols-3 gap-1 bg-bg-void p-0.5 rounded border border-border-hairline">
                  {(["ALL", "UNREAD", "READ"] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`py-1 rounded text-[9px] font-mono font-bold uppercase transition ${
                        filterStatus === status
                          ? "bg-accent-signal text-bg-void font-extrabold"
                          : "text-text-muted hover:text-text-secondary"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Simulated Alerts for deep manual verification */}
          <div className="bg-bg-surface rounded border border-border-hairline p-5 space-y-3.5">
            <h3 className="text-xs font-mono font-bold text-text-primary flex items-center gap-1.5 border-b border-border-hairline pb-3 uppercase tracking-widest">
              <Sparkles className="w-4 h-4 text-accent-signal" />
              Manual Simulator
            </h3>
            <p className="text-[10px] text-text-secondary leading-relaxed font-sans">
              Test end-to-end UI state responsiveness. Click below to inject a simulated diagnostic event.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => triggerSimulatedNotification("SUCCESS")}
                className="bg-bg-void hover:bg-[#10b981]/10 border border-border-hairline hover:border-[#10b981]/20 text-[9px] font-mono font-bold py-2 rounded text-accent-positive transition cursor-pointer"
              >
                + SUCCESS
              </button>
              <button
                onClick={() => triggerSimulatedNotification("INFO")}
                className="bg-bg-void hover:bg-blue-500/10 border border-border-hairline hover:border-blue-500/20 text-[9px] font-mono font-bold py-2 rounded text-blue-400 transition cursor-pointer"
              >
                + INFO
              </button>
              <button
                onClick={() => triggerSimulatedNotification("WARNING")}
                className="bg-bg-void hover:bg-[#F5B942]/10 border border-border-hairline hover:border-[#F5B942]/20 text-[9px] font-mono font-bold py-2 rounded text-[#F5B942] transition cursor-pointer"
              >
                + WARNING
              </button>
              <button
                onClick={() => triggerSimulatedNotification("ERROR")}
                className="bg-bg-void hover:bg-accent-negative/10 border border-border-hairline hover:border-accent-negative/20 text-[9px] font-mono font-bold py-2 rounded text-accent-negative transition cursor-pointer"
              >
                + ERROR
              </button>
            </div>
          </div>
        </div>

        {/* Notifications List Panel */}
        <div className="lg:col-span-3 bg-bg-surface rounded border border-border-hairline p-5 flex flex-col h-[540px]">
          <h3 className="text-xs font-mono font-bold text-text-primary flex items-center gap-1.5 border-b border-border-hairline pb-3 mb-4 uppercase tracking-widest">
            <Clock className="w-4 h-4 text-accent-signal" />
            Active Diagnostic Stream
          </h3>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-2">
            {filteredNotifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-text-secondary text-center font-mono">
                <Bell className="w-8 h-8 text-text-muted mb-2 stroke-[1.2]" />
                <p className="text-[10px] uppercase tracking-widest text-text-primary">No Matching Alerts</p>
                <p className="text-[9px] text-text-muted mt-1 uppercase leading-relaxed">
                  Clear of warnings, notifications, and telemetry updates.
                </p>
              </div>
            ) : (
              filteredNotifs.map((notif) => (
                <div
                  key={notif.id}
                  className={`border rounded p-4 flex justify-between items-start transition-all gap-4 ${
                    notif.read
                      ? "bg-bg-void/50 border-border-hairline opacity-65"
                      : "bg-bg-void border-accent-signal/20 shadow-sm shadow-accent-signal/5"
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`w-7 h-7 rounded border flex items-center justify-center shrink-0 ${getTypeColor(notif.type)}`}>
                      {getIcon(notif.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-mono font-bold text-text-primary uppercase leading-tight">
                          {notif.title}
                        </h4>
                        {!notif.read && (
                          <span className="bg-accent-signal text-bg-void text-[8px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.2 rounded">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary mt-1 font-sans leading-relaxed">
                        {notif.message}
                      </p>
                      <span className="text-[8px] font-mono text-text-muted mt-2 block uppercase">
                        RECEIVED: {new Date(notif.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {!notif.read && (
                    <button
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="text-[9px] font-mono font-bold tracking-wider uppercase text-accent-signal hover:text-accent-signal/80 bg-accent-signal/10 hover:bg-accent-signal/20 px-2.5 py-1.5 rounded transition cursor-pointer shrink-0"
                      title="Mark as Read"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
