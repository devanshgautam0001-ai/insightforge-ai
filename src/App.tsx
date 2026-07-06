/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Upload,
  AlertCircle,
  X,
  FileText,
  RefreshCw
} from "lucide-react";
import { Project, Dataset, ModelRun } from "./types";
import { Language, translations } from "./lib/translations";
import Sidebar from "./components/Sidebar.tsx";
import DashboardOverview from "./components/DashboardOverview.tsx";
import DataCleaner from "./components/DataCleaner.tsx";
import AutoMLLeaderboard from "./components/AutoMLLeaderboard.tsx";
import ModelExplainer from "./components/ModelExplainer.tsx";
import Forecaster from "./components/Forecaster.tsx";
import LiveStream from "./components/LiveStream.tsx";
import CopilotChat from "./components/CopilotChat.tsx";
import SystemMetricsTab from "./components/SystemMetricsTab.tsx";
import UserManagement from "./components/UserManagement.tsx";
import LandingPage from "./components/LandingPage.tsx";
import { useAuth } from "./lib/auth.tsx";

export default function App() {
  const { dbUser, token, loading, logout } = useAuth();

  // Global States
  const [lang, setLang] = useState<Language>("en");
  const [currentTab, setCurrentTab] = useState<string>("overview");

  // Project & Dataset Management
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [latestModel, setLatestModel] = useState<ModelRun | null>(null);

  // Custom Data Upload Modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState("");

  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const t = translations[lang];

  // Fetch all initial authenticated projects from PostgreSQL database
  const fetchProjects = async () => {
    try {
      const activeToken = localStorage.getItem("auth_token") || token || "";
      if (!activeToken) return;

      const res = await fetch("/api/projects", {
        headers: {
          Authorization: `Bearer ${activeToken}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setProjects(data);
        if (data.length > 0) {
          // Maintain selection if still valid, else default to first project
          const stillExists = data.find((p: any) => p.id === selectedProject?.id);
          const activeProj = stillExists || data[0];
          setSelectedProject(activeProj);
          
          if (activeProj.datasets && activeProj.datasets.length > 0) {
            const dsStillExists = activeProj.datasets.find((d: any) => d.id === selectedDataset?.id);
            setSelectedDataset(dsStillExists || activeProj.datasets[0]);
          } else {
            setSelectedDataset(null);
          }
        } else {
          setSelectedProject(null);
          setSelectedDataset(null);
        }
      }
    } catch (err) {
      console.error("Failed to load authenticated workspace projects:", err);
    }
  };

  useEffect(() => {
    if (dbUser && token) {
      fetchProjects();
    }
  }, [dbUser, token]);

  // SPA router effect for /admin, /users, and /settings/users
  useEffect(() => {
    const handleUrlRouting = () => {
      const path = window.location.pathname;
      if (path === "/admin" || path === "/users" || path === "/settings/users") {
        if (dbUser) {
          if (dbUser.role === "SUPER_ADMIN" || dbUser.role === "ADMIN") {
            setCurrentTab("users");
          } else {
            setCurrentTab("overview");
            window.history.replaceState({}, "", "/");
          }
        }
      }
    };

    handleUrlRouting();
    window.addEventListener("popstate", handleUrlRouting);
    return () => window.removeEventListener("popstate", handleUrlRouting);
  }, [dbUser]);

  const handleSetCurrentTab = (tab: string) => {
    setCurrentTab(tab);
    if (tab === "users") {
      window.history.pushState({}, "", "/users");
    } else {
      window.history.pushState({}, "", "/");
    }
  };

  const handleSelectDatasetId = (dsId: string) => {
    if (!selectedProject) return;
    const found = selectedProject.datasets.find(d => d.id === dsId);
    if (found) {
      setSelectedDataset(found);
    }
  };

  const handleDatasetCleaned = (cleanedDataset: Dataset) => {
    if (!selectedProject || !selectedDataset) return;
    const updatedDatasets = selectedProject.datasets.map(d =>
      d.id === cleanedDataset.id ? cleanedDataset : d
    );
    const updatedProj = { ...selectedProject, datasets: updatedDatasets };

    setProjects(projects.map(p => p.id === updatedProj.id ? updatedProj : p));
    setSelectedProject(updatedProj);
    setSelectedDataset(cleanedDataset);
  };

  const handleModelTrained = (newModel: ModelRun) => {
    setLatestModel(newModel);
    setCurrentTab("automl"); // auto switch to model register to show leaderboard!
  };

  // Premium CSV File Drag Drop Upload
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    if (!selectedProject || !dbUser) return;
    if (dbUser.role === "VIEWER") {
      alert("RBAC Restriction: Viewers are not authorized to upload custom enterprise datasets.");
      return;
    }

    setUploading(true);
    setUploadSuccess("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", dbUser.id);

    try {
      const activeToken = localStorage.getItem("auth_token") || token || "";
      const res = await fetch(`/api/projects/${selectedProject.id}/dataset/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeToken}`
        },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        // Refresh project list from DB to load newly ingested dataset with columns & metrics
        await fetchProjects();
        setUploadSuccess(`"${file.name}" uploaded and profiled successfully!`);

        setTimeout(() => {
          setShowUploadModal(false);
          setUploadSuccess("");
          setCurrentTab("overview");
        }, 1500);
      } else {
        alert(data.error || "Failed to process target CSV structure.");
      }
    } catch (err) {
      console.error(err);
      alert("Error transmitting asset payload.");
    } finally {
      setUploading(false);
    }
  };

  const downloadReport = () => {
    if (!selectedProject || !selectedDataset) return;
    const activeToken = localStorage.getItem("auth_token") || token || "";
    window.open(`/api/projects/${selectedProject.id}/dataset/${selectedDataset.id}/report?token=${activeToken}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 animate-pulse">
          Synchronizing secure user workspace...
        </p>
      </div>
    );
  }

  if (!dbUser) {
    return <LandingPage />;
  }

  return (
    <div className="flex h-screen bg-[#09090B] text-slate-200 font-sans antialiased overflow-hidden">
      {/* Sidebar navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={handleSetCurrentTab}
        lang={lang}
        setLang={setLang}
        user={dbUser}
        projects={projects}
        selectedProject={selectedProject}
        setSelectedProject={(p) => {
          setSelectedProject(p);
          if (p.datasets && p.datasets.length > 0) {
            setSelectedDataset(p.datasets[0]);
          } else {
            setSelectedDataset(null);
          }
        }}
        selectedDataset={selectedDataset}
        setSelectedDatasetId={handleSelectDatasetId}
        onUploadDatasetClick={() => {
          if (dbUser.role === "VIEWER") {
            alert("RBAC Restriction: Viewers are not authorized to upload custom enterprise datasets.");
            return;
          }
          setShowUploadModal(true);
        }}
        onLogoutClick={logout}
      />

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col min-w-0 bg-bg-void overflow-hidden relative">
        {/* Live status strip component at top of layout */}
        <div className="h-[28px] border-b border-border-hairline bg-bg-void/80 px-8 flex items-center justify-between text-[9px] font-mono text-text-secondary select-none shrink-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-accent-signal opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-signal"></span>
            </span>
            <span className="tracking-widest uppercase font-bold text-accent-signal">ML CORE · OPERATIONAL</span>
            <span className="text-text-muted">|</span>
            <span className="tracking-wide text-text-muted">PROJECTED HORIZONS: ACTIVE</span>
          </div>
          <div className="flex items-center gap-4">
            {selectedProject && (
              <>
                <span className="text-text-muted">ACTIVE SHELL:</span>
                <span className="text-text-primary uppercase font-bold">{selectedProject.name}</span>
                <span className="text-text-muted">|</span>
              </>
            )}
            <span className="text-accent-signal font-bold tracking-wider">{currentTime}</span>
          </div>
        </div>

        {/* Workspace Top Header */}
        <header className="bg-bg-surface border-b border-border-hairline px-8 py-3.5 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-text-muted">
              {selectedProject?.name ? `PROJECT CONTAINER: ${selectedProject.name.toUpperCase()}` : "INITIALIZING WORKSPACE..."}
            </span>
            <h2 className="text-base font-display font-bold text-text-primary flex items-center gap-2 mt-0.5">
              <FileSpreadsheet className="w-4 h-4 text-accent-signal" />
              {selectedDataset?.name ? selectedDataset.name.toUpperCase() : "AWAITING ENTERPRISE DATASET..."}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {selectedDataset && (
              <button
                onClick={downloadReport}
                className="bg-accent-signal hover:bg-accent-signal/90 text-bg-void font-mono font-bold text-[10px] tracking-wider uppercase py-1.5 px-3.5 rounded-[4px] border border-accent-signal/20 flex items-center gap-1.5 transition-all duration-150 shadow-none"
              >
                <FileText className="w-3.5 h-3.5" />
                {t.exportReport.toUpperCase()}
              </button>
            )}
          </div>
        </header>

        {/* Tab workspace content */}
        <div className="flex-1 p-8 overflow-hidden">
          {currentTab === "overview" && (
            <DashboardOverview dataset={selectedDataset} />
          )}
          {currentTab === "cleaner" && (
            <DataCleaner
              dataset={selectedDataset}
              projectId={selectedProject?.id || ""}
              onDatasetCleaned={handleDatasetCleaned}
              lang={lang}
              user={dbUser}
            />
          )}
          {currentTab === "automl" && (
            <AutoMLLeaderboard
              dataset={selectedDataset}
              projectId={selectedProject?.id || ""}
              onModelTrained={handleModelTrained}
              latestModel={latestModel}
              lang={lang}
              user={dbUser}
            />
          )}
          {currentTab === "explainability" && (
            <ModelExplainer
              latestModel={latestModel}
              dataset={selectedDataset}
              projectId={selectedProject?.id || ""}
              user={dbUser}
            />
          )}
          {currentTab === "forecasting" && (
            <Forecaster
              dataset={selectedDataset}
              projectId={selectedProject?.id || ""}
              lang={lang}
            />
          )}
          {currentTab === "streaming" && (
            <LiveStream lang={lang} />
          )}
          {currentTab === "copilot" && (
            <CopilotChat
              dataset={selectedDataset}
              projectId={selectedProject?.id || ""}
              lang={lang}
              user={dbUser}
            />
          )}
          {currentTab === "metrics" && (
            <SystemMetricsTab projectId={selectedProject?.id || ""} />
          )}
          {currentTab === "users" && (dbUser.role === "SUPER_ADMIN" || dbUser.role === "ADMIN") && (
            <UserManagement currentUser={dbUser} lang={lang} />
          )}
        </div>
      </main>

      {/* CSV / Excel Drag & Drop Upload Dialog Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-extrabold text-white flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-blue-500" />
                Upload Enterprise Dataset
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-zinc-500 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Ingest your row structures to extract mathematical profiles. Supports continuous variables, timestamp trends, and discrete categoricals.
              </p>

              {/* Upload Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3.5 transition ${
                  dragActive
                    ? "border-blue-500 bg-blue-500/5"
                    : "border-zinc-800 bg-zinc-950 hover:bg-zinc-900/55"
                }`}
              >
                <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 shadow-inner">
                  {uploading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold text-zinc-200">
                    {uploading ? "Analyzing row variances..." : "Drag and drop your enterprise CSV here"}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1">Maximum payload boundaries: 25MB</p>
                </div>

                {!uploading && (
                  <label className="bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white font-bold text-[10px] px-3.5 py-2 rounded-lg cursor-pointer shadow-sm transition">
                    Select File
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Alert Warning for RBAC view checks */}
              {dbUser.role === "VIEWER" && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg p-3 flex items-start gap-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">RBAC Permission Override</span>
                    <span>You are experiencing this screen as a <strong>Viewer</strong>. Active modifications are locked under Admin role layers.</span>
                  </div>
                </div>
              )}

              {uploadSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg p-4 flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="font-medium text-emerald-300">{uploadSuccess}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
