/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart
} from "recharts";
import {
  Calendar,
  Sliders,
  TrendingUp,
  LineChart as LineIcon,
  HelpCircle,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { Dataset, ForecastPoint } from "../types";
import { Language, translations } from "../lib/translations";

interface ForecasterProps {
  dataset: Dataset | null;
  projectId: string;
  lang: Language;
}

export default function Forecaster({ dataset, projectId, lang }: ForecasterProps) {
  const t = translations[lang];

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <LineIcon className="w-12 h-12 mb-3 text-slate-400 stroke-[1.2]" />
        <p className="text-sm">Please select a dataset to configure forecasts.</p>
      </div>
    );
  }

  const [dateColumn, setDateColumn] = useState("");
  const [targetColumn, setTargetColumn] = useState("");
  const [horizon, setHorizon] = useState(30);
  const [isComputing, setIsComputing] = useState(false);
  const [forecastPoints, setForecastPoints] = useState<ForecastPoint[]>([]);
  const [seasonality, setSeasonality] = useState("");

  // Auto-detect columns
  useEffect(() => {
    const dateCol = dataset.columns.find(c => c.type === "date" || c.name.toLowerCase().includes("date") || c.name.toLowerCase().includes("time"));
    const numCol = dataset.columns.find(c => c.type === "numeric" && c.name !== "churn" && c.name !== "customer_id");

    if (dateCol) setDateColumn(dateCol.name);
    else setDateColumn(dataset.columns[0]?.name || "");

    if (numCol) setTargetColumn(numCol.name);
    else setTargetColumn(dataset.columns.find(c => c.type === "numeric")?.name || "");
  }, [dataset]);

  const handleForecast = async () => {
    if (!dateColumn || !targetColumn) return;
    setIsComputing(true);

    try {
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch(`/api/projects/${projectId}/dataset/${dataset.id}/forecast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ dateColumn, targetColumn, horizon })
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setForecastPoints(data.points);
          setSeasonality(data.seasonalityDetected);
        } else {
          alert("Handshake mismatch: Forecasting engine did not return JSON.");
        }
      } else {
        let errorMsg = "Failed to calculate forecasting projections.";
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
      alert("Network error computing forecasting matrix");
    } finally {
      setIsComputing(false);
    }
  };

  // Run automatically on load if columns set
  useEffect(() => {
    if (dateColumn && targetColumn) {
      handleForecast();
    }
  }, [dateColumn, targetColumn, horizon]);

  // Trim data points for rendering (e.g., last 40 actual points + forecast horizon to keep chart beautiful)
  const getRenderData = () => {
    if (forecastPoints.length === 0) return [];
    const actualPoints = forecastPoints.filter(p => p.actual !== undefined);
    const forecastOnlyPoints = forecastPoints.filter(p => p.actual === undefined);

    // Keep last 40 actual points to avoid squishing the layout
    const visibleActuals = actualPoints.slice(-40);
    return [...visibleActuals, ...forecastOnlyPoints];
  };

  const renderData = getRenderData();

  return (
    <div className="space-y-6 max-h-[calc(100vh-64px)] overflow-y-auto p-1">
      {/* Title */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <LineIcon className="w-5 h-5 text-indigo-500" />
          Time-Series Seasonal Forecaster
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Project future demand boundaries with trend fitting and expanding confidence uncertainty cones.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Forecast Configuration Form */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-5">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <Sliders className="w-4 h-4 text-indigo-500" />
            Projection Settings
          </h3>

          <div className="space-y-4">
            {/* Date Column Select */}
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                Date Column (X-Axis)
              </label>
              <select
                value={dateColumn}
                onChange={(e) => setDateColumn(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg py-2 px-3 text-slate-700 focus:outline-none"
              >
                {dataset.columns.map(c => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Column Select */}
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                Target Column (Y-Axis)
              </label>
              <select
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg py-2 px-3 text-slate-700 focus:outline-none"
              >
                {dataset.columns.filter(c => c.type === "numeric").map(c => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Horizon Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Forecast Horizon
                </label>
                <span className="text-xs font-bold font-mono text-indigo-600">{horizon} Days</span>
              </div>
              <input
                type="range"
                min="7"
                max="90"
                step="1"
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
              />
            </div>
          </div>
        </div>

        {/* Forecast Visualization Chart */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 flex flex-col h-[480px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Sales & Demand Boundaries
            </h3>
            {seasonality && (
              <span className="text-[10px] font-mono bg-indigo-50 border border-indigo-100/50 text-indigo-600 px-2 py-0.5 rounded uppercase font-bold">
                {seasonality}
              </span>
            )}
          </div>

          <div className="flex-1 w-full min-h-0">
            {isComputing ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-xs">Re-calculating seasonal linear regression baselines...</p>
              </div>
            ) : renderData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={renderData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "6px" }} />

                  {/* Shaded confidence uncertainty band */}
                  <Area
                    type="monotone"
                    dataKey="upperConfidence"
                    stroke="none"
                    fill="#e0e7ff"
                    fillOpacity={0.65}
                    activeDot={false}
                  />
                  {/* Make sure Area can draw boundaries relative to lowerConfidence */}
                  <Area
                    type="monotone"
                    dataKey="lowerConfidence"
                    stroke="none"
                    fill="#ffffff"
                    fillOpacity={1}
                    activeDot={false}
                  />

                  {/* Historical values */}
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#0f172a"
                    strokeWidth={2}
                    dot={false}
                    name="Historical (Actual)"
                  />

                  {/* Projected forecast */}
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Projected Forecast"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <AlertCircle className="w-10 h-10 text-slate-300 mb-2 stroke-[1.2]" />
                <p className="text-xs">Forecast metrics have not loaded correctly.</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-slate-900" />
              <span>Historical Reading</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-indigo-500 border-dashed border-t" />
              <span>Future Projection</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 bg-indigo-100 opacity-60 rounded-sm" />
              <span>95% Confidence Band (IQR Residual Uncertainty)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
