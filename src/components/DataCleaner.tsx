/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle,
  AlertCircle,
  Database,
  RefreshCw,
  Clock,
  Sliders,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { Dataset, User } from "../types";
import { Language, translations } from "../lib/translations";

interface DataCleanerProps {
  dataset: Dataset | null;
  projectId: string;
  onDatasetCleaned: (cleaned: Dataset) => void;
  lang: Language;
  user: User;
}

export default function DataCleaner({ dataset, projectId, onDatasetCleaned, lang, user }: DataCleanerProps) {
  const t = translations[lang];

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-secondary bg-bg-void font-mono">
        <Database className="w-12 h-12 mb-3 text-text-muted stroke-[1.2]" />
        <p className="text-xs uppercase tracking-widest text-text-muted">Please select a dataset to prepare.</p>
      </div>
    );
  }

  const [imputeNulls, setImputeNulls] = useState(true);
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [removeOutliers, setRemoveOutliers] = useState(true);
  const [outlierStrategy, setOutlierStrategy] = useState<"cap" | "drop">("cap");
  const [isCleaning, setIsCleaning] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleClean = async () => {
    // Check RBAC permission (Viewer role cannot edit/clean datasets!)
    if (user.role === "VIEWER") {
      alert("RBAC Restriction: Viewers are not authorized to perform data transformations.");
      return;
    }

    setIsCleaning(true);
    setSuccessMsg("");

    try {
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch(`/api/projects/${projectId}/dataset/${dataset.id}/clean`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          imputeNulls,
          removeDuplicates,
          removeOutliers,
          outlierStrategy,
          userId: user.id
        })
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          onDatasetCleaned(data);
          setSuccessMsg(t.cleanSuccess);
        } else {
          alert("Handshake mismatch: Clean data pipeline did not return JSON.");
        }
      } else {
        let errorMsg = "Failed to clean dataset";
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            errorMsg = data.error || errorMsg;
          }
        } catch (e) {}
        alert(errorMsg);
      }
    } catch (err) {
      console.error(err);
      alert("Network error cleaning dataset");
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-6 max-h-[calc(100vh-100px)] overflow-y-auto p-1 pr-2">
      {/* Title */}
      <div className="bg-bg-surface rounded border border-border-hairline p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-sm font-display font-bold text-text-primary flex items-center gap-2 uppercase tracking-wide">
            <Sparkles className="w-5 h-5 text-accent-signal" />
            Auto-Detect & Preprocess Data
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Identify null indicators, outlier standard deviations, and double entries.
          </p>
        </div>
        {user.role === "VIEWER" && (
          <span className="text-[9px] uppercase font-mono font-bold bg-accent-signal/10 border border-accent-signal/20 text-accent-signal px-2.5 py-1 rounded flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            READ-ONLY LOCK
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configurations Panel */}
        <div className="lg:col-span-1 bg-bg-surface rounded border border-border-hairline p-5 space-y-6">
          <h3 className="text-xs font-mono font-bold text-text-primary flex items-center gap-1.5 border-b border-border-hairline pb-3 mb-2 uppercase tracking-widest">
            <Sliders className="w-4 h-4 text-accent-signal" />
            Preprocessing Toggles
          </h3>

          <div className="space-y-5">
            {/* Toggle 1: Impute Nulls */}
            <div className="flex items-start justify-between">
              <div>
                <label className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider">{t.imputeNulls}</label>
                <p className="text-[10px] text-text-secondary mt-0.5">Fill empty entries with mean/mode</p>
              </div>
              <button
                onClick={() => setImputeNulls(!imputeNulls)}
                className="text-accent-signal hover:text-accent-signal/80 transition cursor-pointer"
                disabled={user.role === "VIEWER"}
              >
                {imputeNulls ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-text-muted" />}
              </button>
            </div>

            {/* Toggle 2: Remove Duplicates */}
            <div className="flex items-start justify-between">
              <div>
                <label className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider">{t.removeDuplicates}</label>
                <p className="text-[10px] text-text-secondary mt-0.5">Drop identical redundant rows</p>
              </div>
              <button
                onClick={() => setRemoveDuplicates(!removeDuplicates)}
                className="text-accent-signal hover:text-accent-signal/80 transition cursor-pointer"
                disabled={user.role === "VIEWER"}
              >
                {removeDuplicates ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-text-muted" />}
              </button>
            </div>

            {/* Toggle 3: Outliers */}
            <div className="flex items-start justify-between">
              <div>
                <label className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider">{t.removeOutliers}</label>
                <p className="text-[10px] text-text-secondary mt-0.5">Cap outlier thresholds using IQR limit</p>
              </div>
              <button
                onClick={() => setRemoveOutliers(!removeOutliers)}
                className="text-accent-signal hover:text-accent-signal/80 transition cursor-pointer"
                disabled={user.role === "VIEWER"}
              >
                {removeOutliers ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-text-muted" />}
              </button>
            </div>

            {removeOutliers && (
              <div className="pl-4 pt-1 space-y-2 border-l border-border-hairline">
                <span className="text-[9px] text-text-secondary font-mono font-bold block uppercase tracking-widest">Outlier Mitigation Strategy</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOutlierStrategy("cap")}
                    className={`px-2.5 py-1 text-[9px] font-mono font-bold rounded border transition uppercase tracking-wider cursor-pointer ${
                      outlierStrategy === "cap"
                        ? "bg-accent-signal text-bg-void border-accent-signal"
                        : "bg-bg-void border-border-hairline text-text-secondary hover:text-text-primary"
                    }`}
                    disabled={user.role === "VIEWER"}
                  >
                    Cap bounds
                  </button>
                  <button
                    onClick={() => setOutlierStrategy("drop")}
                    className={`px-2.5 py-1 text-[9px] font-mono font-bold rounded border transition uppercase tracking-wider cursor-pointer ${
                      outlierStrategy === "drop"
                        ? "bg-accent-signal text-bg-void border-accent-signal"
                        : "bg-bg-void border-border-hairline text-text-secondary hover:text-text-primary"
                    }`}
                    disabled={user.role === "VIEWER"}
                  >
                    Drop row
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleClean}
            disabled={isCleaning || user.role === "VIEWER"}
            className="w-full bg-accent-signal hover:bg-accent-signal/90 disabled:bg-bg-void disabled:text-text-muted text-bg-void font-mono font-bold text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-[4px] border border-accent-signal/20 flex items-center justify-center gap-1.5 mt-4 transition cursor-pointer"
          >
            {isCleaning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {t.cleanDataset.toUpperCase()}
          </button>

          {successMsg && (
            <div className="bg-accent-positive/10 border border-accent-positive/20 text-accent-positive rounded p-4 flex items-center gap-2 text-xs font-mono">
              <CheckCircle className="w-4 h-4 text-accent-positive shrink-0" />
              <span>{successMsg.toUpperCase()}</span>
            </div>
          )}
        </div>

        {/* Cleaning Audit logs Section */}
        <div className="lg:col-span-2 bg-bg-surface rounded border border-border-hairline p-5 flex flex-col h-[500px]">
          <h3 className="text-xs font-mono font-bold text-text-primary flex items-center gap-1.5 border-b border-border-hairline pb-3 mb-4 uppercase tracking-widest">
            <Clock className="w-4 h-4 text-accent-signal" />
            Preprocessing & Profiling Audit Trail
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {dataset.cleanLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-text-secondary text-center font-mono">
                <CheckCircle className="w-8 h-8 text-accent-positive mb-2 stroke-[1.2]" />
                <p className="text-[10px] uppercase tracking-widest text-text-primary">Clean Record Structure</p>
                <p className="text-[9px] text-text-muted mt-1 uppercase leading-relaxed">
                  Dataset is in a pristine, unaltered raw state. Run preprocessing to log transactions.
                </p>
              </div>
            ) : (
              dataset.cleanLogs.map((log, index) => (
                <div key={index} className="bg-bg-void border border-border-hairline p-4 rounded flex gap-3">
                  <div className="w-8 h-8 bg-accent-signal/10 border border-accent-signal/20 rounded-sm flex items-center justify-center text-accent-signal font-mono font-bold text-xs shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-mono font-bold text-text-primary uppercase">{log.action}</h4>
                      <span className="text-[9px] font-mono text-text-muted">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-1 font-sans">{log.details}</p>
                    <span className="inline-block bg-accent-signal/10 border border-accent-signal/20 text-[9px] text-accent-signal font-mono font-bold px-1.5 py-0.2 rounded mt-1.5 uppercase tracking-wider">
                      Rows Affected: {log.affectedRows}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
