/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Cpu,
  Database,
  Activity,
  ShieldCheck,
  RefreshCw,
  Server,
  FileCode,
  HardDrive
} from "lucide-react";
import { SystemMetrics, AuditLogEntry } from "../types";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

interface SystemMetricsTabProps {
  projectId: string;
}

export default function SystemMetricsTab({ projectId }: SystemMetricsTabProps) {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [latencyHistory, setLatencyHistory] = useState<{ time: string; latency: number }[]>([]);

  const fetchTelemetry = async () => {
    try {
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch("/api/system/metrics", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setMetrics(data);
        // Track rolling latency history for chart
        setLatencyHistory(prev => {
          const next = [...prev, {
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            latency: data.averageLatencyMs || 0
          }];
          if (next.length > 15) next.shift();
          return next;
        });
      }
    } catch (err) {
      console.error("Telemetry fetch failed", err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch("/api/system/audit-logs", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setAuditLogs(data);
      }
    } catch (err) {
      console.error("Audit log fetch failed", err);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchTelemetry();
    fetchAuditLogs();
    setIsLoading(false);

    const interval = setInterval(() => {
      fetchTelemetry();
      fetchAuditLogs();
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 max-h-[calc(100vh-64px)] overflow-y-auto p-1">
      {/* Title */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-500" />
            Performance Telemetry & Audit Logs
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor Express event loop latencies, memory footprint, and track comprehensive RBAC security audit trails.
          </p>
        </div>
        <button
          onClick={() => {
            fetchTelemetry();
            fetchAuditLogs();
          }}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Force Telemetry Poll
        </button>
      </div>

      {/* Grid statistics metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* KPI 1: Memory footprint */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">Memory footprint</span>
            <p className="text-lg font-extrabold text-slate-900 mt-0.5">
              {metrics ? `${metrics.memoryUsage} MB` : "---"}
            </p>
            <span className="text-[9px] text-slate-400">
              Node heap size in MB
            </span>
          </div>
        </div>

        {/* KPI 2: Server Latency */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">average latency</span>
            <p className="text-lg font-extrabold text-slate-900 mt-0.5">
              {metrics ? `${(metrics.averageLatencyMs || 0).toFixed(1)} ms` : "---"}
            </p>
            <span className="text-[9px] text-slate-400">
              Express event loop latency
            </span>
          </div>
        </div>

        {/* KPI 3: Request Count */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">Requests Processed</span>
            <p className="text-lg font-extrabold text-slate-900 mt-0.5">
              {metrics ? metrics.requestsTotal : "---"}
            </p>
            <span className="text-[9px] text-slate-400">
              Transactions since boot
            </span>
          </div>
        </div>

        {/* KPI 4: Security Accesses */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-sky-50 rounded-lg flex items-center justify-center text-sky-600 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">Security audits</span>
            <p className="text-lg font-extrabold text-slate-900 mt-0.5">
              {auditLogs.length}
            </p>
            <span className="text-[9px] text-slate-400">
              RBAC authorization logs
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latency History Area Plot */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 flex flex-col h-72">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 mb-4 block">
            Express Response Latency Trends (ms)
          </span>
          <div className="flex-1 w-full min-h-0">
            {latencyHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={latencyHistory} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "6px" }} />
                  <Area type="monotone" dataKey="latency" stroke="#4f46e5" fill="#e0e7ff" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comprehensive Audit Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 overflow-hidden">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3 mb-4">
          <Database className="w-4 h-4 text-indigo-500" />
          Cryptographic Security Access & Mutation Logs
        </h3>

        <div className="overflow-x-auto border border-slate-100 rounded-lg max-h-80">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/50">
                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Target Component</th>
                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-xs">
                  <td className="p-3 font-mono text-slate-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="p-3 font-bold text-slate-700">
                    {log.userName}
                    <span className="block text-[9px] text-indigo-600 font-semibold uppercase">{log.userRole}</span>
                  </td>
                  <td className="p-3">
                    <span className="inline-block bg-indigo-50 border border-indigo-100/40 text-[10px] text-indigo-700 font-bold px-2 py-0.5 rounded">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-slate-600">{log.component}</td>
                  <td className="p-3 text-slate-600 font-medium">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
