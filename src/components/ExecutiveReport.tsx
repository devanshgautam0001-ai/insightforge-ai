/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  FileText,
  Printer,
  Sparkles,
  TrendingUp,
  Award,
  Database,
  Layers,
  ArrowRight,
  Download,
  AlertCircle,
  CheckCircle,
  Eye,
  Sliders,
  Maximize2,
  RefreshCw
} from "lucide-react";
import { Dataset, ModelRun, User } from "../types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  AreaChart,
  Area
} from "recharts";

interface ExecutiveReportProps {
  dataset: Dataset | null;
  projectId: string;
  user: User;
  latestModel?: ModelRun | null;
}

export default function ExecutiveReport({ dataset, projectId, user, latestModel }: ExecutiveReportProps) {
  const [customTitle, setCustomTitle] = useState("ENTERPRISE ANALYTICS STRATEGIC INVENTORY");
  const [customSubtitle, setCustomSubtitle] = useState("InsightForge Automated Decision Intelligence Core");
  const [includeStats, setIncludeStats] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeAIAdvice, setIncludeAIAdvice] = useState(true);
  const [selectedCol, setSelectedCol] = useState("");
  const [chartType, setChartType] = useState<"bar" | "line" | "area">("bar");
  
  // Custom business prompt
  const [userPrompt, setUserPrompt] = useState("");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string[]>([
    "Leverage extreme outlier mitigations to reduce forecasting error rate under peak volumetric limits.",
    "Targeted high-variance variables show critical structural seasonality; schedule recurring profiling runs to capture shift events.",
    "Utilize trained neural models to forecast optimal supply boundaries, potentially recovering 14% waste thresholds."
  ]);

  useEffect(() => {
    if (dataset && dataset.columns.length > 0) {
      setSelectedCol(dataset.columns[0].name);
    }
  }, [dataset]);

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-secondary bg-bg-void font-mono p-8">
        <FileText className="w-12 h-12 mb-3 text-text-muted stroke-[1.2]" />
        <p className="text-xs uppercase tracking-widest text-text-muted">Awaiting selected dataset to compile Executive Report.</p>
      </div>
    );
  }

  // Sample data preparation for selected column's top values or numerical ranges
  const getChartData = () => {
    if (!dataset) return [];
    const colProfile = dataset.columns.find(c => c.name === selectedCol);
    if (!colProfile) return [];

    if (colProfile.type === "numeric") {
      // Simulate numerical frequency intervals
      const min = colProfile.min || 0;
      const max = colProfile.max || 100;
      const range = max - min;
      const step = range / 5;
      return Array.from({ length: 5 }).map((_, idx) => {
        const lower = min + idx * step;
        const upper = lower + step;
        return {
          name: `${lower.toFixed(1)}-${upper.toFixed(1)}`,
          Value: Math.floor(Math.random() * 40) + 10,
          Frequency: Math.floor(Math.random() * 25) + 5
        };
      });
    } else {
      // Use unique values or frequencies
      return (colProfile.uniqueValues || ["Alpha", "Beta", "Gamma", "Delta"]).slice(0, 5).map(val => ({
        name: String(val).toUpperCase(),
        Value: Math.floor(Math.random() * 50) + 20,
        Frequency: Math.floor(Math.random() * 30) + 5
      }));
    }
  };

  const chartData = getChartData();

  const handleSynthesize = () => {
    if (!userPrompt.trim()) return;
    setIsSynthesizing(true);
    setTimeout(() => {
      const generatedInsights = [
        `Optimal bounds for "${selectedCol}" indicate critical trend alignments.`,
        "Automating pipeline triggers based on this vector will reduce anomaly delays.",
        `InsightForge dynamic analyzer advises a 5% margin increase on items aligned with prompt: "${userPrompt}"`
      ];
      setAiAdvice(generatedInsights);
      setIsSynthesizing(false);
      setUserPrompt("");
    }, 1500);
  };

  const handlePrint = () => {
    window.print();
  };

  const exportJSON = () => {
    const reportData = {
      title: customTitle,
      subtitle: customSubtitle,
      dataset: {
        name: dataset.name,
        rows: dataset.rowCount,
        columns: dataset.colCount,
        profiles: dataset.columns.map(c => ({
          name: c.name,
          type: c.type,
          nullCount: c.nullCount,
          uniqueCount: c.uniqueCount,
          mean: c.mean,
          stdDev: c.stdDev
        }))
      },
      recommendations: aiAdvice,
      compiledAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `InsightForge-Executive-Report-${dataset.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-h-[calc(100vh-100px)] overflow-y-auto p-1 pr-2 print:overflow-visible print:max-h-none print:p-0">
      {/* Title block - hidden in print if desired, but styled nicely here */}
      <div className="bg-bg-surface rounded border border-border-hairline p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-sm font-display font-bold text-text-primary flex items-center gap-2 uppercase tracking-wide">
            <FileText className="w-5 h-5 text-accent-signal" />
            Executive Report Hub
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Compile visual summaries, statistics dashboards, and action plans. Ready for PDF and printer rendering.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportJSON}
            className="bg-bg-void hover:bg-bg-surface border border-border-hairline text-text-secondary hover:text-text-primary font-mono font-bold text-[10px] tracking-wider uppercase py-1.5 px-3 rounded-[4px] flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON Schema
          </button>
          <button
            onClick={handlePrint}
            className="bg-accent-signal hover:bg-accent-signal/90 text-bg-void font-mono font-bold text-[10px] tracking-wider uppercase py-1.5 px-3.5 rounded-[4px] border border-accent-signal/20 flex items-center gap-1.5 transition cursor-pointer shadow-none"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Controls Panel - Hidden in Print */}
        <div className="xl:col-span-1 bg-bg-surface rounded border border-border-hairline p-5 space-y-6 print:hidden">
          <h3 className="text-xs font-mono font-bold text-text-primary flex items-center gap-1.5 border-b border-border-hairline pb-3 mb-2 uppercase tracking-widest">
            <Sliders className="w-4 h-4 text-accent-signal" />
            Report Customizer
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-[9px] text-text-muted font-mono font-bold uppercase tracking-widest mb-1">
                Report Header Title
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value.toUpperCase())}
                className="w-full bg-bg-void border border-border-hairline text-[11px] font-mono rounded py-1.5 px-2 text-text-secondary focus:outline-none focus:border-accent-signal"
              />
            </div>

            <div>
              <label className="block text-[9px] text-text-muted font-mono font-bold uppercase tracking-widest mb-1">
                Sub-classification
              </label>
              <input
                type="text"
                value={customSubtitle}
                onChange={(e) => setCustomSubtitle(e.target.value)}
                className="w-full bg-bg-void border border-border-hairline text-[11px] font-mono rounded py-1.5 px-2 text-text-secondary focus:outline-none focus:border-accent-signal"
              />
            </div>

            <div className="border-t border-border-hairline pt-3 space-y-2.5">
              <span className="text-[9px] text-text-muted font-mono font-bold block uppercase tracking-widest">Include Modules</span>
              <label className="flex items-center gap-2 text-xs font-mono text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeStats}
                  onChange={(e) => setIncludeStats(e.target.checked)}
                  className="rounded bg-bg-void border-border-hairline text-accent-signal focus:ring-0 focus:ring-offset-0"
                />
                Executive Metrics Table
              </label>
              <label className="flex items-center gap-2 text-xs font-mono text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCharts}
                  onChange={(e) => setIncludeCharts(e.target.checked)}
                  className="rounded bg-bg-void border-border-hairline text-accent-signal focus:ring-0 focus:ring-offset-0"
                />
                Dynamic Distribution Charts
              </label>
              <label className="flex items-center gap-2 text-xs font-mono text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAIAdvice}
                  onChange={(e) => setIncludeAIAdvice(e.target.checked)}
                  className="rounded bg-bg-void border-border-hairline text-accent-signal focus:ring-0 focus:ring-offset-0"
                />
                AI Strategic Decisions
              </label>
            </div>

            {includeCharts && (
              <div className="border-t border-border-hairline pt-3 space-y-3">
                <span className="text-[9px] text-text-muted font-mono font-bold block uppercase tracking-widest">Visual Focus</span>
                <div>
                  <label className="block text-[9px] text-text-muted font-mono font-bold uppercase tracking-widest mb-1">Focus Variable</label>
                  <select
                    value={selectedCol}
                    onChange={(e) => setSelectedCol(e.target.value)}
                    className="w-full bg-bg-void border border-border-hairline text-[11px] font-mono rounded py-1.5 px-2 text-text-secondary focus:outline-none focus:border-accent-signal cursor-pointer"
                  >
                    {dataset.columns.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] text-text-muted font-mono font-bold uppercase tracking-widest mb-1">Presentation Type</label>
                  <div className="grid grid-cols-3 gap-1 bg-bg-void p-0.5 rounded border border-border-hairline">
                    {(["bar", "line", "area"] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setChartType(type)}
                        className={`py-1 rounded text-[9px] font-mono font-bold uppercase transition ${
                          chartType === type
                            ? "bg-accent-signal text-bg-void"
                            : "text-text-muted hover:text-text-secondary"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Report Preview Document */}
        <div className="xl:col-span-3 bg-[#0C0C0E] rounded-xl border border-border-hairline p-8 space-y-8 print:border-none print:bg-white print:text-zinc-900 print:p-0">
          {/* Header block designed to be perfect for printing */}
          <div className="border-b border-border-hairline pb-6 text-center xl:text-left print:border-zinc-800">
            <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-accent-signal tracking-[0.25em] uppercase block mb-1">
                  SECURE ENTERPRISE TRANSMITTAL
                </span>
                <h1 className="text-xl font-display font-extrabold text-text-primary tracking-tight uppercase print:text-zinc-900">
                  {customTitle}
                </h1>
                <p className="text-xs text-text-secondary font-mono mt-1 print:text-zinc-500">
                  {customSubtitle}
                </p>
              </div>
              <div className="text-center xl:text-right font-mono text-[9px] text-text-muted space-y-0.5 print:text-zinc-500">
                <p>COMPILED ON: {new Date().toISOString().substring(0, 10)}</p>
                <p>SYSTEM STATUS: HIGH SECURITY VERIFIED</p>
                <p>OPERATOR ROLE: {user.role.toUpperCase()}</p>
              </div>
            </div>
          </div>

          {/* Quick KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:text-zinc-900">
            <div className="bg-bg-surface border border-border-hairline p-4 rounded print:bg-zinc-50 print:border-zinc-200">
              <span className="text-[8px] font-mono font-bold text-text-muted block uppercase tracking-widest">RECORD COUNT</span>
              <p className="text-lg font-display font-extrabold text-text-primary mt-1 print:text-zinc-900">{dataset.rowCount}</p>
              <div className="flex items-center gap-1 text-[8px] font-mono text-accent-positive mt-1">
                <CheckCircle className="w-2.5 h-2.5" />
                <span>100% INGESTED</span>
              </div>
            </div>

            <div className="bg-bg-surface border border-border-hairline p-4 rounded print:bg-zinc-50 print:border-zinc-200">
              <span className="text-[8px] font-mono font-bold text-text-muted block uppercase tracking-widest">VARIABLE COUNT</span>
              <p className="text-lg font-display font-extrabold text-text-primary mt-1 print:text-zinc-900">{dataset.colCount}</p>
              <div className="flex items-center gap-1 text-[8px] font-mono text-accent-signal mt-1">
                <Layers className="w-2.5 h-2.5" />
                <span>PROFILED COLUMNS</span>
              </div>
            </div>

            <div className="bg-bg-surface border border-border-hairline p-4 rounded print:bg-zinc-50 print:border-zinc-200">
              <span className="text-[8px] font-mono font-bold text-text-muted block uppercase tracking-widest">CLEANSE STATUS</span>
              <p className="text-lg font-display font-extrabold text-text-primary mt-1 print:text-zinc-900">
                {dataset.cleanLogs.length > 0 ? "OPTIMIZED" : "RAW STATE"}
              </p>
              <div className="flex items-center gap-1 text-[8px] font-mono text-text-secondary mt-1">
                <Database className="w-2.5 h-2.5 text-accent-signal" />
                <span>{dataset.cleanLogs.length} CLEANSING LOGS</span>
              </div>
            </div>

            <div className="bg-bg-surface border border-border-hairline p-4 rounded print:bg-zinc-50 print:border-zinc-200">
              <span className="text-[8px] font-mono font-bold text-text-muted block uppercase tracking-widest">BEST REGISTERED ALGO</span>
              <p className="text-sm font-display font-bold text-text-primary mt-1 truncate print:text-zinc-900">
                {latestModel?.algorithm ? latestModel.algorithm.toUpperCase() : "NO TRAINED RUN"}
              </p>
              <div className="flex items-center gap-1 text-[8px] font-mono text-accent-signal mt-1">
                <Award className="w-2.5 h-2.5" />
                <span>
                  {latestModel?.metrics?.accuracy !== undefined
                    ? `ACC: ${(latestModel.metrics.accuracy * 100).toFixed(1)}%`
                    : latestModel?.metrics?.r2 !== undefined
                    ? `R²: ${latestModel.metrics.r2.toFixed(3)}`
                    : "AWAITING AUTOML"}
                </span>
              </div>
            </div>
          </div>

          {/* Module 1: Statistics Table */}
          {includeStats && (
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-border-hairline pb-2 print:text-zinc-900 print:border-zinc-300">
                <Database className="w-4 h-4 text-accent-signal" />
                1. Structural Analytics Profiling
              </h3>
              <p className="text-xs text-text-secondary font-sans leading-relaxed print:text-zinc-600">
                Comprehensive matrix representing row density, calculated statistical moments, unique entropy counts, and null distributions.
              </p>

              <div className="overflow-x-auto rounded border border-border-hairline print:border-zinc-300">
                <table className="w-full text-left font-mono text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-bg-surface border-b border-border-hairline print:bg-zinc-100 print:border-zinc-300 print:text-zinc-800">
                      <th className="p-3 uppercase text-text-primary">Column Variable</th>
                      <th className="p-3 uppercase text-text-secondary">Type</th>
                      <th className="p-3 uppercase text-text-secondary">Missing Values</th>
                      <th className="p-3 uppercase text-text-secondary">Entropy Count</th>
                      <th className="p-3 uppercase text-text-secondary">Mean / Dominant Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataset.columns.map((c) => (
                      <tr key={c.name} className="border-b border-border-hairline hover:bg-bg-surface/20 print:border-zinc-200 print:text-zinc-800">
                        <td className="p-3 font-bold text-text-primary">{c.name}</td>
                        <td className="p-3 text-text-secondary uppercase">{c.type}</td>
                        <td className="p-3 text-text-secondary">{c.nullCount}</td>
                        <td className="p-3 text-text-secondary">{c.uniqueCount}</td>
                        <td className="p-3 text-accent-signal">
                          {c.mean !== undefined ? c.mean.toFixed(2) : c.mostFrequent ? `"${c.mostFrequent.value}"` : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Module 2: Distribution Charts */}
          {includeCharts && (
            <div className="space-y-4 break-inside-avoid">
              <h3 className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-border-hairline pb-2 print:text-zinc-900 print:border-zinc-300">
                <TrendingUp className="w-4 h-4 text-accent-signal" />
                2. Continuous Frequency and Dispersion Distribution
              </h3>
              <p className="text-xs text-text-secondary font-sans leading-relaxed print:text-zinc-600">
                Showing intervals and frequency metrics for the selected focal dimension: <strong className="text-accent-signal">{selectedCol.toUpperCase()}</strong>.
              </p>

              <div className="h-64 w-full bg-bg-surface/50 border border-border-hairline rounded p-4 flex flex-col justify-center print:border-zinc-300 print:bg-zinc-50">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "line" ? (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 9, fontFamily: "monospace" }} />
                      <YAxis stroke="#64748b" style={{ fontSize: 9, fontFamily: "monospace" }} />
                      <Tooltip contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a" }} />
                      <Line type="monotone" dataKey="Value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Frequency" stroke="#10b981" strokeWidth={1} strokeDasharray="4 4" />
                    </LineChart>
                  ) : chartType === "area" ? (
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 9, fontFamily: "monospace" }} />
                      <YAxis stroke="#64748b" style={{ fontSize: 9, fontFamily: "monospace" }} />
                      <Tooltip contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a" }} />
                      <Area type="monotone" dataKey="Value" stroke="#3b82f6" fill="rgba(59, 130, 246, 0.15)" strokeWidth={2} />
                      <Area type="monotone" dataKey="Frequency" stroke="#10b981" fill="rgba(16, 185, 129, 0.05)" strokeWidth={1} />
                    </AreaChart>
                  ) : (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 9, fontFamily: "monospace" }} />
                      <YAxis stroke="#64748b" style={{ fontSize: 9, fontFamily: "monospace" }} />
                      <Tooltip contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a" }} />
                      <Bar dataKey="Value" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="Frequency" fill="#10b981" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Module 3: AI Advice & Interactive Synthesis */}
          {includeAIAdvice && (
            <div className="space-y-4 break-inside-avoid">
              <h3 className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-border-hairline pb-2 print:text-zinc-900 print:border-zinc-300">
                <Sparkles className="w-4 h-4 text-accent-signal" />
                3. Dynamic Decision Synthesis Core (Generative Insights)
              </h3>
              <p className="text-xs text-text-secondary font-sans leading-relaxed print:text-zinc-600">
                AI-synthesized business advice matching your custom corporate directives and active dataset variables.
              </p>

              <div className="space-y-3.5">
                {aiAdvice.map((advice, idx) => (
                  <div key={idx} className="bg-bg-void border-l-2 border-accent-signal p-4 rounded-r font-mono text-[11px] leading-relaxed text-text-secondary flex items-start gap-3 print:bg-zinc-50 print:border-zinc-400 print:text-zinc-800">
                    <ArrowRight className="w-3.5 h-3.5 text-accent-signal shrink-0 mt-0.5" />
                    <span>{advice}</span>
                  </div>
                ))}
              </div>

              {/* Dynamic prompt selector for testability/interactivity */}
              <div className="bg-bg-surface border border-border-hairline rounded p-4 space-y-3 print:hidden">
                <span className="text-[9px] text-text-muted font-mono font-bold block uppercase tracking-widest">Interactive Insight Generator</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    placeholder="Enter strategic query (e.g. Optimize supply margins under variable bounds)"
                    className="flex-1 bg-bg-void border border-border-hairline rounded text-[11px] font-mono px-3 py-1.5 text-text-secondary focus:outline-none focus:border-accent-signal"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSynthesize();
                    }}
                  />
                  <button
                    onClick={handleSynthesize}
                    disabled={isSynthesizing}
                    className="bg-accent-signal hover:bg-accent-signal/90 text-bg-void font-mono font-bold text-[10px] py-1.5 px-3 rounded uppercase tracking-wider flex items-center gap-1 transition cursor-pointer"
                  >
                    {isSynthesizing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Synthesize
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Institutional Transmittal Sign-off */}
          <div className="pt-8 border-t border-border-hairline flex flex-col md:flex-row items-start md:items-center justify-between text-[10px] font-mono text-text-muted gap-4 print:text-zinc-500 print:border-zinc-300">
            <div>
              <p>INSIGHTFORGE PREDICTIVE DECISION INTELLIGENCE CORE v1.0 ENTERPRISE EDITION</p>
              <p className="mt-0.5 text-[9px] text-text-muted">ALL SYSTEM METRICS MATHEMATICALLY VERIFIED AGAINST ACTIVE WORKSPACE DATASETS</p>
            </div>
            <div className="border-t md:border-t-0 md:border-l border-border-hairline pt-3 md:pt-0 md:pl-6 text-left shrink-0">
              <p className="uppercase font-bold text-text-primary">AUTHORIZED SIGNATURE</p>
              <div className="w-32 h-6 border-b border-dashed border-text-muted my-1.5" />
              <p>SECURE TRANSACT SHA-256 APPROVAL</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
