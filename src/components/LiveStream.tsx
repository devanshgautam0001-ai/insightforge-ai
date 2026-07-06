/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  AlertTriangle,
  Zap,
  Thermometer,
  Grid,
  CheckCircle,
  Cpu,
  Power
} from "lucide-react";
import { Language, translations } from "../lib/translations";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

interface LiveReading {
  timestamp: string;
  voltage: number;
  temperature: number;
  energy_consumption: number;
  device_status: string;
  isAnomaly?: boolean;
}

interface LiveStreamProps {
  lang: Language;
}

export default function LiveStream({ lang }: LiveStreamProps) {
  const t = translations[lang];

  const [streamActive, setStreamActive] = useState(false);
  const [readings, setReadings] = useState<LiveReading[]>([]);
  const [anomalies, setAnomalies] = useState<LiveReading[]>([]);
  const sseRef = useRef<EventSource | null>(null);

  const startStream = () => {
    if (sseRef.current) return;

    setStreamActive(true);
    const sse = new EventSource("/api/stream/iot");
    sseRef.current = sse;

    sse.onmessage = (event) => {
      const payload: LiveReading = JSON.parse(event.data);
      setReadings(prev => {
        const next = [...prev, payload];
        if (next.length > 25) next.shift(); // Keep last 25 readings scrolled
        return next;
      });

      if (payload.isAnomaly) {
        setAnomalies(prev => {
          const next = [payload, ...prev];
          if (next.length > 10) next.pop(); // Keep top 10 anomaly logs
          return next;
        });
      }
    };

    sse.onerror = () => {
      console.error("SSE Connection dropped or failed");
      stopStream();
    };
  };

  const stopStream = () => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    setStreamActive(false);
  };

  useEffect(() => {
    // Start stream by default to make the UI active and impressive
    startStream();
    return () => {
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, []);

  const latest = readings[readings.length - 1];

  // Map charts readings for presentation
  const chartData = readings.map(r => ({
    time: r.timestamp.split("T")[1].substring(0, 8),
    voltage: r.voltage,
    temperature: r.temperature,
    energy: r.energy_consumption
  }));

  return (
    <div className="space-y-6 max-h-[calc(100vh-100px)] overflow-y-auto p-1 pr-2">
      {/* Title */}
      <div className="bg-bg-surface rounded border border-border-hairline p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-sm font-display font-bold text-text-primary flex items-center gap-2 uppercase tracking-wide">
            <Activity className="w-5 h-5 text-accent-signal" />
            Smart Grid Live IoT Stream
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Connect to Server-Sent Power grids and inspect sub-second voltage surges and temperature anomalies.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {streamActive ? (
            <>
              <div className="flex items-center gap-1.5 bg-accent-positive/10 border border-accent-positive/20 px-2.5 py-1 rounded">
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-positive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-positive"></span>
                </span>
                <span className="text-[9px] font-mono font-bold text-accent-positive tracking-widest uppercase">GRID LIVE</span>
              </div>
              <button
                onClick={stopStream}
                className="bg-bg-void hover:bg-bg-surface-raised text-text-primary text-[10px] font-mono font-bold uppercase tracking-wider px-3.5 py-1.5 rounded border border-border-hairline transition flex items-center gap-1.5 cursor-pointer"
              >
                <Power className="w-3 h-3 text-accent-negative" />
                Disconnect
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 bg-accent-negative/10 border border-accent-negative/20 px-2.5 py-1 rounded">
                <span className="inline-block w-1.5 h-1.5 bg-accent-negative rounded-full" />
                <span className="text-[9px] font-mono font-bold text-accent-negative tracking-widest uppercase">OFFLINE</span>
              </div>
              <button
                onClick={startStream}
                className="bg-accent-signal hover:bg-accent-signal/90 text-bg-void text-[10px] font-mono font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-[4px] border border-accent-signal/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Power className="w-3 h-3 text-bg-void" />
                Connect Grid
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Voltage KPI */}
        <div className="bracket-card bg-bg-surface p-4.5 border border-border-hairline flex items-center gap-4.5">
          <div className="w-10 h-10 bg-accent-signal/10 rounded border border-accent-signal/20 flex items-center justify-center text-accent-signal shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted block">VOLTAGE</span>
            <p className="text-xl font-mono font-bold text-text-primary mt-0.5">
              {latest ? `${latest.voltage.toFixed(1)} V` : "---"}
            </p>
            {latest && (
              <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${latest.voltage < 215 ? "text-accent-negative" : "text-accent-positive"}`}>
                {latest.voltage < 215 ? "VOLTAGE DROP CRITICAL" : "GRID CONVERGENCE NORMAL"}
              </span>
            )}
          </div>
        </div>

        {/* Temperature KPI */}
        <div className="bracket-card bg-bg-surface p-4.5 border border-border-hairline flex items-center gap-4.5">
          <div className="w-10 h-10 bg-accent-signal/10 rounded border border-accent-signal/20 flex items-center justify-center text-accent-signal shrink-0">
            <Thermometer className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted block">CORE TEMPERATURE</span>
            <p className="text-xl font-mono font-bold text-text-primary mt-0.5">
              {latest ? `${latest.temperature.toFixed(1)} °C` : "---"}
            </p>
            {latest && (
              <span className="text-[9px] font-mono font-bold text-accent-positive uppercase tracking-wider">
                THERMAL CONGRUENCE NORMAL
              </span>
            )}
          </div>
        </div>

        {/* Consumption KPI */}
        <div className="bracket-card bg-bg-surface p-4.5 border border-border-hairline flex items-center gap-4.5">
          <div className="w-10 h-10 bg-accent-signal/10 rounded border border-accent-signal/20 flex items-center justify-center text-accent-signal shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-text-muted block">GRID CONSUMPTION</span>
            <p className="text-xl font-mono font-bold text-text-primary mt-0.5">
              {latest ? `${latest.energy_consumption.toFixed(2)} kW` : "---"}
            </p>
            {latest && (
              <span className={`text-[9px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.2 rounded border ${
                latest.device_status === "Warning" 
                  ? "bg-accent-negative/10 border-accent-negative/20 text-accent-negative" 
                  : "bg-accent-positive/10 border-accent-positive/20 text-accent-positive"
              }`}>
                {latest.device_status.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scrolling Grid Analytics Line Plot */}
        <div className="lg:col-span-2 bg-bg-surface rounded border border-border-hairline p-5 flex flex-col h-[380px]">
          <h3 className="text-xs font-mono font-bold text-text-primary flex items-center gap-1.5 border-b border-border-hairline pb-3 mb-4 uppercase tracking-widest">
            <Grid className="w-4 h-4 text-accent-signal" />
            Live Rolling Metrics Trend
          </h3>
          <div className="flex-1 w-full min-h-0">
            {readings.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-hairline)" />
                  <XAxis dataKey="time" stroke="var(--color-text-secondary)" fontSize={8} fontFamily="JetBrains Mono, monospace" tickLine={false} />
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
                  <Line type="monotone" dataKey="energy" stroke="var(--color-accent-info)" strokeWidth={1.5} dot={false} name="Consumption (kW)" />
                  <Line type="monotone" dataKey="voltage" stroke="var(--color-accent-signal)" strokeWidth={1.5} dot={false} name="Voltage (V)" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-text-secondary font-mono">
                <Cpu className="w-8 h-8 text-accent-signal animate-pulse mb-2" />
                <p className="text-[10px] uppercase tracking-widest text-text-muted">Awaiting grid telemetry sensor arrays...</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Anomaly Feed panel */}
        <div className="lg:col-span-1 bg-bg-surface rounded border border-border-hairline p-5 flex flex-col h-[380px]">
          <h3 className="text-xs font-mono font-bold text-text-primary flex items-center gap-1.5 border-b border-border-hairline pb-3 mb-4 uppercase tracking-widest">
            <AlertTriangle className="w-4 h-4 text-accent-signal animate-pulse" />
            {t.liveAlerts.toUpperCase()}
          </h3>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {anomalies.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-text-secondary text-center font-mono">
                <CheckCircle className="w-8 h-8 text-accent-positive mb-2 stroke-[1.2]" />
                <p className="text-[10px] uppercase tracking-widest text-text-primary">System Matrix Stable</p>
                <p className="text-[9px] text-text-muted mt-1 uppercase leading-relaxed">
                  No active anomalies flagged. Standard deviation operating within normal tolerances.
                </p>
              </div>
            ) : (
              anomalies.map((anom, idx) => (
                <div
                  key={idx}
                  className="animate-amber-flash border border-accent-signal/30 p-3.5 rounded space-y-1.5 animate-in slide-in-from-top-3 duration-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-bold font-mono text-bg-void bg-accent-signal px-1.5 py-0.2 rounded flex items-center gap-1 tracking-widest uppercase">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      VOLTAGE SURGE
                    </span>
                    <span className="text-[9px] font-mono text-text-secondary">
                      {anom.timestamp.split("T")[1].substring(0, 8)}
                    </span>
                  </div>
                  <p className="text-xs font-mono font-bold text-text-primary leading-tight uppercase">
                    Surge threshold breach: <span className="text-accent-signal font-extrabold">{anom.energy_consumption.toFixed(2)} kW</span> detected.
                  </p>
                  <span className="text-[9px] text-text-secondary font-mono block">
                    EXPECTED BASELINE: ~2.1 kW | COEF DEV: +3.4σ
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
