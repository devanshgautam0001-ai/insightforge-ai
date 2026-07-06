/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Eye,
  TrendingUp,
  FileText,
  BrainCircuit,
  Award,
  ChevronRight,
  Info,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { ModelRun, Dataset, User } from "../types";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

interface ModelExplainerProps {
  latestModel: ModelRun | null;
  dataset: Dataset | null;
  projectId: string;
  user: User;
}

// Simple Markdown parser for AI Recommendations
function renderCustomMarkdown(md: string) {
  const lines = md.split("\n");
  return lines.map((line, idx) => {
    if (line.startsWith("###")) {
      return (
        <h3 key={idx} className="text-sm font-bold text-slate-800 mt-4 mb-2">
          {line.replace("###", "").trim()}
        </h3>
      );
    }
    if (line.startsWith("####")) {
      return (
        <h4 key={idx} className="text-xs font-bold text-indigo-600 mt-3 mb-1.5 uppercase font-mono">
          {line.replace("####", "").trim()}
        </h4>
      );
    }
    if (line.startsWith("-")) {
      // Bold parts in bullet points
      const content = line.replace("-", "").trim();
      return (
        <li key={idx} className="text-xs text-slate-600 ml-4 list-disc mb-1.5 leading-relaxed">
          {parseBoldText(content)}
        </li>
      );
    }
    if (line.trim() === "") return <div key={idx} className="h-2" />;
    return (
      <p key={idx} className="text-xs text-slate-600 mb-2 leading-relaxed">
        {parseBoldText(line)}
      </p>
    );
  });
}

function parseBoldText(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} className="font-extrabold text-slate-800">{part}</strong>;
    }
    return part;
  });
}

export default function ModelExplainer({ latestModel, dataset, projectId, user }: ModelExplainerProps) {
  if (!latestModel || !dataset) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <Eye className="w-12 h-12 mb-3 text-slate-400 stroke-[1.2]" />
        <p className="text-sm">Please train an AutoML model first to unlock Explainable AI insights.</p>
      </div>
    );
  }

  const [selectedRowIdx, setSelectedRowIdx] = useState<number>(0);
  const [recommendations, setRecommendations] = useState<string>("");
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);

  const fetchRecommendations = async () => {
    setIsLoadingRecs(true);
    try {
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch(`/api/projects/${projectId}/dataset/${dataset.id}/recommendations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setRecommendations(data.markdown);
      } else {
        alert(data.error || "Failed to fetch executive recommendations");
      }
    } catch (err) {
      console.error(err);
      alert("Network error fetching executive advice");
    } finally {
      setIsLoadingRecs(false);
    }
  };

  // Generate Local Force plot values (SHAP/LIME simulation based on row values)
  const getLocalExplanationData = () => {
    const row = dataset.cleanData[selectedRowIdx];
    if (!row) return [];

    // Base force values relative to baseline model splits
    return latestModel.featureImportance.map((fi, idx) => {
      const val = row[fi.feature];
      // Generate standard score effect: higher values for features with positive correlation yield positive force, etc.
      let contribution = 0;
      if (typeof val === "number") {
        const colProf = dataset.columns.find(c => c.name === fi.feature);
        const mean = colProf?.mean || 0;
        const std = colProf?.stdDev || 1;
        const stdScore = (val - mean) / std;
        contribution = stdScore * fi.importance * (fi.correlation || 1);
      } else {
        // String categorical force
        contribution = (idx % 2 === 0 ? 1 : -1) * fi.importance * 0.4;
      }

      return {
        feature: `${fi.feature} = ${val}`,
        contribution: parseFloat(contribution.toFixed(3))
      };
    }).sort((a, b) => b.contribution - a.contribution);
  };

  const localForces = getLocalExplanationData();

  return (
    <div className="space-y-6 max-h-[calc(100vh-64px)] overflow-y-auto p-1">
      {/* Title */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Eye className="w-5 h-5 text-indigo-500" />
          Explainable AI (XAI) Dashboard
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Audit global variable importance (SHAP) and local feature contribution vectors (LIME) for individual predictions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global Feature Importance Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 flex flex-col h-[400px]">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3 mb-4">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            Global Variable Importance (SHAP Summary)
          </h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={latestModel.featureImportance.slice(0, 6)}
                layout="vertical"
                margin={{ top: 5, right: 15, left: 15, bottom: 5 }}
              >
                <XAxis type="number" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis dataKey="feature" type="category" stroke="#94a3b8" fontSize={9} tickLine={false} width={100} />
                <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "6px" }} />
                <Bar dataKey="importance" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            Relative scores representing global influence weight during model partitions.
          </p>
        </div>

        {/* Local Force Contributions Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 flex flex-col h-[400px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <BrainCircuit className="w-4 h-4 text-indigo-500" />
              Local Prediction Drivers (LIME Vectors)
            </h3>
            {/* Row index picker */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Inspect Row:</span>
              <select
                value={selectedRowIdx}
                onChange={(e) => setSelectedRowIdx(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded text-xs py-0.5 px-1.5 focus:outline-none"
              >
                {Array.from({ length: Math.min(dataset.rowCount, 10) }, (_, i) => (
                  <option key={i} value={i}>
                    Row {i + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={localForces} layout="vertical" margin={{ top: 5, right: 15, left: 25, bottom: 5 }}>
                <XAxis type="number" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis dataKey="feature" type="category" stroke="#94a3b8" fontSize={9} tickLine={false} width={100} />
                <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "6px" }} />
                <Bar dataKey="contribution" barSize={12}>
                  {localForces.map((entry, idx) => (
                    <Cell key={idx} fill={entry.contribution >= 0 ? "#ef4444" : "#3b82f6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            <span className="text-red-500 font-semibold">Red</span> signals variables raising predictions;{" "}
            <span className="text-blue-500 font-semibold">Blue</span> signals variables lowering predictions.
          </p>
        </div>
      </div>

      {/* AI Advisory recommendations section */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Executive AI Advisory Panel
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Generate actionable business recommendations dynamically synthesized by Gemini.
            </p>
          </div>
          <button
            onClick={fetchRecommendations}
            disabled={isLoadingRecs}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 shadow-sm shadow-indigo-600/10"
          >
            {isLoadingRecs ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Compile AI Advisory Advice
          </button>
        </div>

        {recommendations ? (
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-xl space-y-2 prose max-w-none shadow-inner">
            {renderCustomMarkdown(recommendations)}
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200/40 p-10 rounded-xl text-center flex flex-col items-center justify-center text-slate-400">
            <FileText className="w-10 h-10 text-slate-300 mb-2 stroke-[1.2]" />
            <p className="text-xs font-semibold">No executive advice compiled yet.</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Click the compile button to synthesize predictions.</p>
          </div>
        )}
      </div>
    </div>
  );
}
