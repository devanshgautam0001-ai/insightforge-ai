/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Columns,
  Hash,
  Binary,
  AlertTriangle,
  Grid,
  Plus,
  Trash2
} from "lucide-react";
import { Dataset } from "../types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  AreaChart,
  Area
} from "recharts";

interface DashboardOverviewProps {
  dataset: Dataset | null;
}

interface CustomChart {
  id: string;
  type: "bar" | "line" | "scatter" | "area";
  xColumn: string;
  yColumn: string;
}

// Light-weight CountUp Component for elegant numeric count-up animations
function CountUp({ value }: { value: number }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCurrent(value);
      return;
    }

    let startTimestamp: number | null = null;
    const duration = 400; // 400ms duration
    const startValue = 0;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out quad
      const easedProgress = progress * (2 - progress);
      setCurrent(Math.floor(easedProgress * (value - startValue) + startValue));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCurrent(value);
      }
    };

    window.requestAnimationFrame(step);
  }, [value]);

  return <span>{current.toLocaleString()}</span>;
}

export default function DashboardOverview({ dataset }: DashboardOverviewProps) {
  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-secondary bg-bg-void font-mono">
        <FileSpreadsheet className="w-12 h-12 mb-3 text-text-muted stroke-[1.2]" />
        <p className="text-xs uppercase tracking-widest text-text-muted">No enterprise dataset loaded.</p>
      </div>
    );
  }

  const [selectedCol, setSelectedCol] = useState<string>(dataset.columns[0]?.name || "");
  const [customCharts, setCustomCharts] = useState<CustomChart[]>([
    { id: "c1", type: "line", xColumn: dataset.columns[0]?.name || "", yColumn: dataset.columns.find(c => c.type === "numeric")?.name || "" }
  ]);
  const [chartType, setChartType] = useState<"bar" | "line" | "scatter" | "area">("bar");
  const [chartX, setChartX] = useState<string>(dataset.columns[0]?.name || "");
  const [chartY, setChartY] = useState<string>(dataset.columns.find(c => c.type === "numeric")?.name || "");

  const activeProfile = dataset.columns.find(c => c.name === selectedCol) || dataset.columns[0];

  // Helper to generate distribution/frequency data for column profiling
  const getProfileChartData = () => {
    if (!activeProfile) return [];
    if (activeProfile.type === "numeric") {
      const vals = dataset.cleanData.map(r => Number(r[activeProfile.name])).filter(v => !isNaN(v));
      if (vals.length === 0) return [];
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const range = max - min;
      const binCount = 8;
      const binWidth = range / binCount || 1;

      const bins = Array.from({ length: binCount }, (_, i) => {
        const lower = min + i * binWidth;
        const upper = lower + binWidth;
        return {
          binRange: `${lower.toFixed(1)} - ${upper.toFixed(1)}`,
          count: 0
        };
      });

      vals.forEach(v => {
        let idx = Math.floor((v - min) / binWidth);
        if (idx >= binCount) idx = binCount - 1;
        if (idx < 0) idx = 0;
        if (bins[idx]) bins[idx].count++;
      });
      return bins;
    } else {
      const counts: Record<string, number> = {};
      dataset.cleanData.forEach(r => {
        const val = String(r[activeProfile.name]);
        counts[val] = (counts[val] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    }
  };

  const handleAddChart = () => {
    if (!chartX || !chartY) return;
    const newChart: CustomChart = {
      id: `custom-${Date.now()}`,
      type: chartType,
      xColumn: chartX,
      yColumn: chartY
    };
    setCustomCharts([...customCharts, newChart]);
  };

  const handleDeleteChart = (id: string) => {
    setCustomCharts(customCharts.filter(c => c.id !== id));
  };

  // Helper to get raw data points for custom workspace charts
  const getCustomChartData = (xCol: string, yCol: string) => {
    return dataset.cleanData.slice(0, 40).map(r => ({
      [xCol]: r[xCol],
      [yCol]: typeof r[yCol] === "number" ? r[yCol] : parseFloat(r[yCol]) || 0
    }));
  };

  return (
    <div className="space-y-6 max-h-[calc(100vh-100px)] overflow-y-auto p-1 pr-2">
      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Rows Card */}
        <div className="bracket-card bg-bg-surface p-4.5 border border-border-hairline flex items-center gap-4.5">
          <div className="w-10 h-10 bg-accent-signal/10 rounded border border-accent-signal/20 flex items-center justify-center text-accent-signal shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted block">TOTAL ROWS</span>
            <p className="text-2xl font-mono font-bold text-text-primary mt-0.5">
              <CountUp value={dataset.rowCount} />
            </p>
          </div>
        </div>

        {/* Columns Card */}
        <div className="bracket-card bg-bg-surface p-4.5 border border-border-hairline flex items-center gap-4.5">
          <div className="w-10 h-10 bg-accent-signal/10 rounded border border-accent-signal/20 flex items-center justify-center text-accent-signal shrink-0">
            <Columns className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted block">COLUMNS</span>
            <p className="text-2xl font-mono font-bold text-text-primary mt-0.5">
              <CountUp value={dataset.colCount} />
            </p>
          </div>
        </div>

        {/* Numeric Variables Card */}
        <div className="bracket-card bg-bg-surface p-4.5 border border-border-hairline flex items-center gap-4.5">
          <div className="w-10 h-10 bg-accent-signal/10 rounded border border-accent-signal/20 flex items-center justify-center text-accent-signal shrink-0">
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted block">NUMERIC LABELS</span>
            <p className="text-2xl font-mono font-bold text-text-primary mt-0.5">
              <CountUp value={dataset.columns.filter(c => c.type === "numeric").length} />
            </p>
          </div>
        </div>

        {/* Nulls Detected Card */}
        <div className="bracket-card bg-bg-surface p-4.5 border border-border-hairline flex items-center gap-4.5">
          <div className="w-10 h-10 bg-accent-negative/10 rounded border border-accent-negative/20 flex items-center justify-center text-accent-negative shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted block">NULL CELLS</span>
            <p className="text-2xl font-mono font-bold text-accent-negative mt-0.5">
              <CountUp value={dataset.columns.reduce((acc, c) => acc + c.nullCount, 0)} />
            </p>
          </div>
        </div>
      </div>

      {/* Main Section: Interactive Column Profiler */}
      <div className="bg-bg-surface rounded border border-border-hairline p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border-hairline pb-4 mb-4 gap-4">
          <div>
            <h2 className="text-sm font-display font-bold text-text-primary flex items-center gap-2 uppercase tracking-wide">
              <Binary className="w-4 h-4 text-accent-signal" />
              Dynamic Variable Profiler
            </h2>
            <p className="text-xs text-text-secondary mt-0.5 font-sans">
              Select any column below to audit statistical properties and frequencies.
            </p>
          </div>
          {/* Column Picker chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {dataset.columns.map(c => (
              <button
                key={c.name}
                onClick={() => setSelectedCol(c.name)}
                className={`px-3 py-1 text-[10px] font-mono font-bold rounded transition-all duration-150 uppercase tracking-wider ${
                  selectedCol === c.name
                    ? "bg-accent-signal text-bg-void"
                    : "bg-bg-void border border-border-hairline text-text-secondary hover:text-text-primary hover:border-text-secondary"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {activeProfile && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
            {/* Column Audit Metrics */}
            <div className="bg-bg-void border border-border-hairline rounded p-4.5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border-hairline">
                <span className="text-xs font-mono font-bold text-text-primary">{activeProfile.name.toUpperCase()}</span>
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-accent-signal/10 border border-accent-signal/20 text-accent-signal">
                  {activeProfile.type}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-surface p-2.5 rounded border border-border-hairline text-center">
                  <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-text-muted block">NULL COUNT</span>
                  <p className="text-sm font-mono font-bold text-text-primary mt-1">{activeProfile.nullCount}</p>
                </div>
                <div className="bg-bg-surface p-2.5 rounded border border-border-hairline text-center">
                  <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-text-muted block">UNIQUE VALUES</span>
                  <p className="text-sm font-mono font-bold text-text-primary mt-1">{activeProfile.uniqueCount}</p>
                </div>
              </div>

              {activeProfile.type === "numeric" ? (
                <div className="space-y-2 pt-2 border-t border-border-hairline text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-text-secondary uppercase text-[10px] tracking-wider">MEAN:</span>
                    <strong className="text-text-primary font-bold">{activeProfile.mean}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary uppercase text-[10px] tracking-wider">MEDIAN:</span>
                    <strong className="text-text-primary font-bold">{activeProfile.median}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary uppercase text-[10px] tracking-wider">STD DEVIATION:</span>
                    <strong className="text-text-primary font-bold">{activeProfile.stdDev}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary uppercase text-[10px] tracking-wider">RANGE BOUNDS:</span>
                    <strong className="text-text-primary font-bold">
                      [{activeProfile.min} — {activeProfile.max}]
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-border-hairline space-y-2 text-xs font-mono">
                  <p className="text-text-secondary uppercase text-[10px] tracking-wider">MOST FREQUENT VALUE:</p>
                  {activeProfile.mostFrequent ? (
                    <div className="bg-bg-surface p-3 rounded border border-border-hairline">
                      <p className="font-bold text-text-primary truncate">"{activeProfile.mostFrequent.value}"</p>
                      <span className="text-[9px] text-text-muted mt-1 block">OCCURRED {activeProfile.mostFrequent.count} TIMES</span>
                    </div>
                  ) : (
                    <p className="text-text-muted italic text-[10px]">NO DOMINANT VALUE FREQUENCY</p>
                  )}
                </div>
              )}
            </div>

            {/* Column Audit distribution chart */}
            <div className="lg:col-span-2 bg-bg-void border border-border-hairline rounded p-4.5 flex flex-col h-64">
              <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-text-secondary mb-4 block">
                {activeProfile.type === "numeric" ? "VALUE DISTRIBUTION HISTOGRAM" : "CATEGORY FREQUENCY COUNTS"}
              </span>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getProfileChartData() as any} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <defs>
                      <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-accent-signal)" stopOpacity={0.85}/>
                        <stop offset="95%" stopColor="var(--color-accent-signal)" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-hairline)" />
                    <XAxis
                      dataKey={activeProfile.type === "numeric" ? "binRange" : "value"}
                      stroke="var(--color-text-secondary)"
                      fontSize={8}
                      fontFamily="JetBrains Mono, monospace"
                      tickLine={false}
                    />
                    <YAxis stroke="var(--color-text-secondary)" fontSize={8} fontFamily="JetBrains Mono, monospace" tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(245, 185, 66, 0.05)" }}
                      contentStyle={{
                        backgroundColor: "var(--color-bg-surface)",
                        borderColor: "var(--color-border-hairline)",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontFamily: "JetBrains Mono, monospace",
                        color: "var(--color-text-primary)"
                      }}
                      itemStyle={{ color: "var(--color-accent-signal)" }}
                    />
                    <Bar dataKey="count" fill="url(#amberGrad)" stroke="var(--color-accent-signal)" strokeWidth={1} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom BI Interactive Dashboard Builder */}
      <div className="bg-bg-surface rounded border border-border-hairline p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border-hairline pb-4 mb-4 gap-4">
          <div>
            <h2 className="text-sm font-display font-bold text-text-primary flex items-center gap-2 uppercase tracking-wide">
              <Grid className="w-4 h-4 text-accent-signal" />
              Interactive BI Dashboard Builder
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Configure and pin custom analytics charts to your layout workspace.
            </p>
          </div>
        </div>

        {/* Chart Configurator Panel */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-bg-void border border-border-hairline rounded mb-6">
          <div>
            <label className="block text-[9px] text-text-secondary font-mono font-bold uppercase tracking-widest mb-1.5">CHART TYPE</label>
            <select
              value={chartType}
              onChange={(e: any) => setChartType(e.target.value)}
              className="w-full bg-bg-surface border border-border-hairline text-xs rounded py-1.5 px-2 text-text-primary focus:outline-none focus:border-accent-signal cursor-pointer"
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="scatter">Scatter Plot</option>
              <option value="area">Area Chart</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] text-text-secondary font-mono font-bold uppercase tracking-widest mb-1.5">X-AXIS COLUMN</label>
            <select
              value={chartX}
              onChange={(e) => setChartX(e.target.value)}
              className="w-full bg-bg-surface border border-border-hairline text-xs rounded py-1.5 px-2 text-text-primary focus:outline-none focus:border-accent-signal cursor-pointer"
            >
              {dataset.columns.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[9px] text-text-secondary font-mono font-bold uppercase tracking-widest mb-1.5">Y-AXIS COLUMN (NUMERIC)</label>
            <select
              value={chartY}
              onChange={(e) => setChartY(e.target.value)}
              className="w-full bg-bg-surface border border-border-hairline text-xs rounded py-1.5 px-2 text-text-primary focus:outline-none focus:border-accent-signal cursor-pointer"
            >
              {dataset.columns.filter(c => c.type === "numeric").map(c => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleAddChart}
              className="w-full bg-accent-signal hover:bg-accent-signal/90 text-bg-void font-mono font-bold text-[10px] uppercase tracking-wider py-2 px-4 rounded-[4px] border border-accent-signal/20 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Pin Chart
            </button>
          </div>
        </div>

        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {customCharts.map(cc => {
            const chartData = getCustomChartData(cc.xColumn, cc.yColumn);
            return (
              <div key={cc.id} className="border border-border-hairline rounded p-4.5 bg-bg-void flex flex-col h-80 relative group">
                <button
                  onClick={() => handleDeleteChart(cc.id)}
                  className="absolute top-4 right-4 text-text-secondary hover:text-accent-negative transition opacity-0 group-hover:opacity-100 duration-150"
                  title="Remove Chart"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="mb-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[8px] uppercase font-mono font-bold bg-accent-signal/10 border border-accent-signal/20 text-accent-signal px-1.5 py-0.5 rounded tracking-wider">
                      {cc.type}
                    </span>
                    <h3 className="text-[11px] font-mono font-bold text-text-primary uppercase">
                      {cc.yColumn} vs {cc.xColumn}
                    </h3>
                  </div>
                </div>

                <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    {cc.type === "bar" ? (
                      <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-hairline)" />
                        <XAxis dataKey={cc.xColumn} stroke="var(--color-text-secondary)" fontSize={8} fontFamily="JetBrains Mono, monospace" tickLine={false} />
                        <YAxis stroke="var(--color-text-secondary)" fontSize={8} fontFamily="JetBrains Mono, monospace" tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--color-bg-surface)",
                            borderColor: "var(--color-border-hairline)",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontFamily: "JetBrains Mono, monospace",
                            color: "var(--color-text-primary)"
                          }}
                        />
                        <Bar dataKey={cc.yColumn} fill="url(#amberGrad)" stroke="var(--color-accent-signal)" strokeWidth={1} radius={[2, 2, 0, 0]} />
                      </BarChart>
                    ) : cc.type === "line" ? (
                      <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-hairline)" />
                        <XAxis dataKey={cc.xColumn} stroke="var(--color-text-secondary)" fontSize={8} fontFamily="JetBrains Mono, monospace" tickLine={false} />
                        <YAxis stroke="var(--color-text-secondary)" fontSize={8} fontFamily="JetBrains Mono, monospace" tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--color-bg-surface)",
                            borderColor: "var(--color-border-hairline)",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontFamily: "JetBrains Mono, monospace",
                            color: "var(--color-text-primary)"
                          }}
                        />
                        <Line type="monotone" dataKey={cc.yColumn} stroke="var(--color-accent-signal)" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    ) : cc.type === "area" ? (
                      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-hairline)" />
                        <XAxis dataKey={cc.xColumn} stroke="var(--color-text-secondary)" fontSize={8} fontFamily="JetBrains Mono, monospace" tickLine={false} />
                        <YAxis stroke="var(--color-text-secondary)" fontSize={8} fontFamily="JetBrains Mono, monospace" tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--color-bg-surface)",
                            borderColor: "var(--color-border-hairline)",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontFamily: "JetBrains Mono, monospace",
                            color: "var(--color-text-primary)"
                          }}
                        />
                        <Area type="monotone" dataKey={cc.yColumn} stroke="var(--color-accent-signal)" fill="url(#amberGrad)" strokeWidth={1.5} />
                      </AreaChart>
                    ) : (
                      <ScatterChart margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-hairline)" />
                        <XAxis type="category" dataKey={cc.xColumn} stroke="var(--color-text-secondary)" fontSize={8} fontFamily="JetBrains Mono, monospace" tickLine={false} />
                        <YAxis type="number" dataKey={cc.yColumn} stroke="var(--color-text-secondary)" fontSize={8} fontFamily="JetBrains Mono, monospace" tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--color-bg-surface)",
                            borderColor: "var(--color-border-hairline)",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontFamily: "JetBrains Mono, monospace",
                            color: "var(--color-text-primary)"
                          }}
                        />
                        <Scatter data={chartData} fill="var(--color-accent-signal)" />
                      </ScatterChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Raw Data Preview Grid */}
      <div className="bg-bg-surface rounded border border-border-hairline p-5 overflow-hidden">
        <h2 className="text-sm font-display font-bold text-text-primary mb-3.5 flex items-center gap-2 uppercase tracking-wide">
          <FileSpreadsheet className="w-4 h-4 text-accent-signal" />
          Cleaned Data Inspection
        </h2>
        <div className="overflow-x-auto border border-border-hairline rounded max-h-96">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-void border-b border-border-hairline">
                {dataset.columns.map(c => (
                  <th key={c.name} className="p-3 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataset.cleanData.slice(0, 10).map((row, idx) => (
                <tr key={idx} className="border-b border-border-hairline hover:bg-bg-surface-raised/40 transition-colors">
                  {dataset.columns.map(c => (
                    <td key={c.name} className="p-3 text-xs font-mono text-text-secondary">
                      {row[c.name] !== undefined && row[c.name] !== null ? String(row[c.name]) : <span className="text-text-muted italic">null</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[9px] text-text-muted mt-2 text-right font-mono tracking-wider">SHOWING FIRST 10 ROWS OF {dataset.rowCount} TOTAL RECORDS</p>
      </div>
    </div>
  );
}
