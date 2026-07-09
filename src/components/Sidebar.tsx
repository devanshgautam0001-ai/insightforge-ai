/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  LayoutDashboard,
  Database,
  Brain,
  Eye,
  LineChart,
  Activity,
  MessageSquare,
  Cpu,
  Globe,
  Plus,
  ChevronDown,
  LogOut,
  UserCheck,
  FileText,
  Bell,
  Settings,
  Mail
} from "lucide-react";
import { Project, Dataset, User } from "../types";
import { Language, translations } from "../lib/translations";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  user: User;
  projects: Project[];
  selectedProject: Project | null;
  setSelectedProject: (proj: Project) => void;
  selectedDataset: Dataset | null;
  setSelectedDatasetId: (id: string) => void;
  onUploadDatasetClick: () => void;
  onLogoutClick: () => void;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  lang,
  setLang,
  user,
  projects,
  selectedProject,
  setSelectedProject,
  selectedDataset,
  setSelectedDatasetId,
  onUploadDatasetClick,
  onLogoutClick
}: SidebarProps) {
  const t = translations[lang];
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const menuItems = [
    { id: "overview", label: t.overview, icon: LayoutDashboard },
    { id: "cleaner", label: t.cleaner, icon: Database },
    { id: "automl", label: t.automl, icon: Brain },
    { id: "explainability", label: t.explainability, icon: Eye },
    { id: "forecasting", label: t.forecasting, icon: LineChart },
    { id: "streaming", label: t.streaming, icon: Activity },
    { id: "copilot", label: t.copilot, icon: MessageSquare },
    { id: "metrics", label: t.metrics, icon: Cpu },
    { id: "executive_report", label: t.executiveReport || "Executive Report", icon: FileText },
    { id: "notifications", label: t.notifications || "Notifications", icon: Bell },
    { id: "settings", label: t.settings || "Settings", icon: Settings },
    ...(user.role === "SUPER_ADMIN" || user.role === "ADMIN" ? [
      { id: "users", label: "User Management", icon: UserCheck },
      { id: "enterprise_requests", label: "Enterprise Requests", icon: Mail }
    ] : [])
  ];

  // RBAC indicator dot colors
  // SUPER_ADMIN = red (#FF4E4E), ADMIN = amber (#F5B942), ANALYST = blue (#4EA1FF), VIEWER = muted gray (#545B6E)
  const getRoleDotClass = (role: string) => {
    switch (role?.toUpperCase()) {
      case "SUPER_ADMIN":
        return "bg-[#FF4E4E]";
      case "ADMIN":
        return "bg-[#F5B942]";
      case "ANALYST":
        return "bg-[#4EA1FF]";
      default:
        return "bg-[#545B6E]";
    }
  };

  return (
    <aside className="w-64 bg-bg-void text-text-primary flex flex-col h-screen border-r border-border-hairline shrink-0">
      {/* Platform Title */}
      <div className="p-4 border-b border-border-hairline flex flex-col justify-center">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-accent-signal rounded-sm rotate-45 flex items-center justify-center shrink-0 border border-accent-signal/30">
            <div className="w-3.5 h-3.5 bg-bg-void rounded-sm -rotate-45 flex items-center justify-center font-mono text-[9px] font-black text-accent-signal">
              IF
            </div>
          </div>
          <div>
            <h1 className="text-sm font-display font-bold tracking-tighter text-text-primary uppercase">
              {t.title}
            </h1>
            <p className="text-[8px] text-accent-signal tracking-widest font-mono font-bold">
              SYS STATUS: OPERATIONAL
            </p>
          </div>
        </div>
      </div>

      {/* Project & Dataset Selectors */}
      <div className="px-4 py-3.5 border-b border-border-hairline space-y-3.5 bg-bg-surface/30">
        {/* Project Selector */}
        <div>
          <label className="block text-[9px] text-text-muted font-mono font-bold uppercase tracking-widest mb-1.5">
            {t.project}
          </label>
          <div className="relative">
            <select
              value={selectedProject?.id || ""}
              onChange={(e) => {
                const found = projects.find(p => p.id === e.target.value);
                if (found) setSelectedProject(found);
              }}
              className="w-full bg-bg-void border border-border-hairline text-[11px] font-mono rounded py-1 px-2 text-text-secondary focus:outline-none focus:border-accent-signal appearance-none cursor-pointer"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name.toUpperCase()}
                </option>
              ))}
              {projects.length === 0 && <option value="">NO ACTIVE PROJECTS</option>}
            </select>
            <ChevronDown className="w-3 h-3 text-text-muted absolute right-2 top-2 pointer-events-none" />
          </div>
        </div>

        {/* Dataset Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[9px] text-text-muted font-mono font-bold uppercase tracking-widest">
              {t.dataset}
            </label>
            <button
              onClick={onUploadDatasetClick}
              className="text-accent-signal hover:text-accent-signal/80 flex items-center gap-0.5 text-[9px] font-mono font-bold tracking-wider"
              title="Upload New Data"
            >
              <Plus className="w-2.5 h-2.5" />
              {t.upload.toUpperCase()}
            </button>
          </div>
          <div className="relative">
            <select
              value={selectedDataset?.id || ""}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="w-full bg-bg-void border border-border-hairline text-[11px] font-mono rounded py-1 px-2 text-text-secondary focus:outline-none focus:border-accent-signal appearance-none cursor-pointer"
            >
              {selectedProject?.datasets.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name.toUpperCase()}
                </option>
              )) || <option value="">NO DATASETS AVAILABLE</option>}
            </select>
            <ChevronDown className="w-3 h-3 text-text-muted absolute right-2 top-2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Workspace Menu */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 h-[38px] transition-all duration-150 relative ${
                isActive
                  ? "bg-bg-surface-raised text-text-primary border-l-2 border-accent-signal"
                  : "text-text-secondary hover:bg-bg-surface/40 hover:text-text-primary border-l-2 border-transparent"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-accent-signal" : "text-text-muted"}`} />
              <span className="font-mono text-[10px] font-bold tracking-wider uppercase">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Global Config (Language / Profile Controls) */}
      <div className="p-4 border-t border-border-hairline bg-bg-surface/20 space-y-3.5">
        {/* Language switch */}
        <div className="flex items-center justify-between text-[10px] text-text-secondary">
          <div className="flex items-center gap-1.5 font-mono">
            <Globe className="w-3.5 h-3.5 text-accent-signal" />
            <span className="font-bold tracking-widest text-[9px]">LANGUAGE</span>
          </div>
          <div className="flex bg-bg-void p-0.5 rounded border border-border-hairline">
            {(["en", "hi", "es"] as Language[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase transition-all ${
                  lang === l
                    ? "bg-accent-signal text-bg-void font-extrabold"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Real User Profile Display */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="w-full bg-bg-void border border-border-hairline p-2 rounded flex items-center justify-between text-left hover:bg-bg-surface transition duration-150"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${getRoleDotClass(user.role)}`} />
              <div className="truncate">
                <p className="text-[11px] font-mono font-bold text-text-primary truncate max-w-[120px]">{user.name || "USER WORKSPACE"}</p>
                <span className="inline-block px-1 py-0.2 text-[8px] font-mono font-bold uppercase tracking-widest text-text-muted">
                  {user.role}
                </span>
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-text-muted shrink-0" />
          </button>

          {showUserDropdown && (
            <div className="absolute bottom-12 left-0 w-full bg-bg-surface border border-border-hairline rounded shadow-xl py-1 z-50">
              <div className="px-3 py-1.5 border-b border-border-hairline text-[9px] font-mono text-text-muted tracking-wider truncate">
                {user.email}
              </div>
              <button
                onClick={() => {
                  setShowUserDropdown(false);
                  onLogoutClick();
                }}
                className="w-full text-left px-3 py-2 text-[10px] font-mono font-bold tracking-wider uppercase hover:bg-accent-negative/10 text-accent-negative flex items-center gap-2 transition"
              >
                <LogOut className="w-3 h-3" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
