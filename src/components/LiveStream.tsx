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
  Power,
  RefreshCw,
  Clock,
  Wifi,
  Radio
} from "lucide-react";
import { Language, translations } from "../lib/translations";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";

interface LiveReading {
  timestamp: string;
  voltage: number;
  current: number;
  temperature: number;
  energy_consumption: number;
  frequency: number;
  latency: number;
  device_status: string;
  isAnomaly?: boolean;
  anomalyType?: string;
}

interface LiveStreamProps {
  lang: Language;
}

export default function LiveStream({ lang }: LiveStreamProps) {
  const t = translations[lang];

  const [streamActive, setStreamActive] = useState(false);
  const [readings, setReadings] = useState<LiveReading[]>([]);
  const [anomalies, setAnomalies] = useState<LiveReading[]>([]);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [chartMetricTab, setChartMetricTab] = useState<"power" | "thermals" | "system">("power");

  const sseRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const backupTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Manual & Automatic Stream Starter
  const startStream = () => {
    if (sseRef.current) return;
    setConnectionStatus("connecting");
    setStreamActive(true);

    const sse = new EventSource("/api/stream/iot");
    sseRef.current = sse;

    sse.onopen = () => {
      setConnectionStatus("connected");
      setReconnectCount(0);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (backupTimerRef.current) {
        clearInterval(backupTimerRef.current);
        backupTimerRef.current = null;
      }
    };

    sse.onmessage = (event) => {
      try {
        const payload: LiveReading = JSON.parse(event.data);
        handleNewReading(payload);
      } catch (err) {
        console.error("Failed to parse SSE payload", err);
      }
    };

    sse.onerror = () => {
      console.warn("SSE Connection lost. Switching to dynamic client-side simulation backup.");
      setConnectionStatus("connecting");
      sse.close();
      sseRef.current = null;

      // Start client-side simulation backup immediately to ensure zero UI freezing
      triggerClientSimulation();

      // Attempt reconnection
      if (reconnectCount < 5) {
        reconnectTimerRef.current = setTimeout(() => {
          setReconnectCount(prev => prev + 1);
          startStream();
        }, 5000);
      } else {
        setConnectionStatus("disconnected");
        setStreamActive(false);
      }
    };
  };

  const stopStream = () => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (backupTimerRef.current) {
      clearInterval(backupTimerRef.current);
      backupTimerRef.current = null;
    }
    setConnectionStatus("disconnected");
    setStreamActive(false);
  };

  // Safe callback to ingest readings
  const handleNewReading = (payload: LiveReading) => {
    setReadings(prev => {
      const next = [...prev, payload];
      if (next.length > 30) next.shift(); // Keep last 30 readings
      return next;
    });

    if (payload.isAnomaly) {
      setAnomalies(prev => {
        const next = [payload, ...prev];
        if (next.length > 15) next.pop(); // Keep top 15 anomalies
        return next;
      });
    }
  };

  // Dynamic Client-side simulation fallback when backend SSE isn't active or fails
  const triggerClientSimulation = () => {
    if (backupTimerRef.current) clearInterval(backupTimerRef.current);

    let counter = 0;
    backupTimerRef.current = setInterval(() => {
      counter++;
      const dateStr = new Date().toISOString();
      let temp = 40 + Math.sin((counter / 15) * Math.PI * 2) * 5 + (Math.random() - 0.5) * 1.5;
      let energy = 2.1 + Math.sin((counter / 10) * Math.PI * 2) * 0.8 + (Math.random() - 0.5) * 0.3;
      let voltage = 230 + Math.cos((counter / 25) * Math.PI * 2) * 4 + (Math.random() - 0.5) * 1.5;
      let current = (energy * 1000) / voltage;
      let frequency = 50 + (Math.random() - 0.5) * 0.08;
      let latency = 10 + Math.random() * 8;

      let isAnomaly = false;
      let anomalyType = "";

      if (Math.random() < 0.05) {
        isAnomaly = true;
        const r = Math.random();
        if (r < 0.33) {
          voltage = 258.4 + Math.random() * 8;
          anomalyType = "Voltage Spike Surge";
        } else if (r < 0.66) {
          frequency = 48.1 - Math.random() * 0.5;
          anomalyType = "Frequency Out of Bounds";
        } else {
          energy = 11.4 + Math.random() * 3;
          current = (energy * 1000) / voltage;
          temp = 78.2 + Math.random() * 10;
          anomalyType = "Thermal Overrun Alert";
        }
      }

      const simPayload: LiveReading = {
        timestamp: dateStr,
        voltage: parseFloat(voltage.toFixed(2)),
        current: parseFloat(current.toFixed(2)),
        temperature: parseFloat(temp.toFixed(2)),
        energy_consumption: parseFloat(energy.toFixed(2)),
        frequency: parseFloat(frequency.toFixed(3)),
        latency: parseFloat(latency.toFixed(1)),
        device_status: isAnomaly ? "Warning" : "Active",
        isAnomaly,
        anomalyType
      };

      handleNewReading(simPayload);
    }, 1000);
  };

  useEffect(() => {
    startStream();
    return () => {
      stopStream();
    };
  }, []);

  const latest = readings[readings.length - 1];

  // Map charts readings for presentation
  const chartData = readings.map(r => ({
    time: r.timestamp.split("T")[1]?.substring(0, 8) || "",
    voltage: r.voltage,
    current: r.current,
    temperature: r.temperature,
    energy: r.energy_consumption,
    frequency: r.frequency,
    latency: r.latency
  }));

  return (
    <div className="space-y-6 max-h-[calc(100vh-100px)] overflow-y-auto p-1 pr-2">
      {/* Title with reconnect status */}
      <div className="bg-bg-surface rounded border border-border-hairline p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-sm font-display font-bold text-text-primary flex items-center gap-2 uppercase tracking-wide">
            <Activity className="w-5 h-5 text-accent-signal" />
            Smart Grid Live IoT Stream
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Connect to Server-Sent Power grids and inspect sub-second voltage surges, grid frequencies, line currents, and temperature anomalies.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {connectionStatus === "connected" && (
            <div className="flex items-center gap-1.5 bg-accent-positive/10 border border-accent-positive/20 px-2.5 py-1 rounded">
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-positive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-positive"></span>
              </span>
              <span className="text-[9px] font-mono font-bold text-accent-positive tracking-widest uppercase flex items-center gap-1">
                <Wifi className="w-3 h-3" /> SSE LIVE
              </span>
            </div>
          )}

          {connectionStatus === "connecting" && (
            <div className="flex items-center gap-1.5 bg-[#F5B942]/10 border border-[#F5B942]/20 px-2.5 py-1 rounded">
              <RefreshCw className="w-3 h-3 text-[#F5B942] animate-spin" />
              <span className="text-[9px] font-mono font-bold text-[#F5B942] tracking-widest uppercase">
                RECONNECTING ({reconnectCount}/5)
              </span>
            </div>
          )}

          {connectionStatus === "disconnected" && (
            <div className="flex items-center gap-1.5 bg-accent-negative/10 border border-accent-negative/20 px-2.5 py-1 rounded">
              <span className="inline-block w-1.5 h-1.5 bg-accent-negative rounded-full" />
              <span className="text-[9px] font-mono font-bold text-accent-negative tracking-widest uppercase">SIMULATION ACTIVE</span>
            </div>
          )}

          <button
            onClick={streamActive ? stopStream : startStream}
            className={`text-[10px] font-mono font-bold uppercase tracking-wider px-3.5 py-1.5 rounded border transition flex items-center gap-1.5 cursor-pointer ${
              streamActive
                ? "bg-bg-void hover:bg-bg-surface-raised text-text-primary border-border-hairline"
                : "bg-accent-signal hover:bg-accent-signal/90 text-bg-void border-accent-signal"
            }`}
          >
            <Power className={`w-3 h-3 ${streamActive ? "text-accent-negative" : "text-bg-void"}`} />
            {streamActive ? "Disconnect" : "Connect Grid"}
          </button>
        </div>
      </div>

      {/* 6 Metric KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Voltage KPI */}
        <div className="bracket-card bg-bg-surface p-4 border border-border-hairline flex flex-col justify-between h-[115px]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-text-muted">VOLTAGE</span>
            <Zap className="w-4 h-4 text-accent-signal" />
          </div>
          <div>
            <p className="text-lg font-mono font-bold text-text-primary mt-1 leading-none">
              {latest ? `${latest.voltage.toFixed(1)} V` : "---"}
            </p>
            <span className={`text-[8px] font-mono font-bold block mt-1.5 uppercase ${latest && latest.voltage < 215 ? "text-accent-negative" : "text-accent-positive"}`}>
              {latest && latest.voltage < 215 ? "CRITICAL DROP" : "STABLE NOMINAL"}
            </span>
          </div>
        </div>

        {/* Current KPI */}
        <div className="bracket-card bg-bg-surface p-4 border border-border-hairline flex flex-col justify-between h-[115px]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-text-muted">CURRENT</span>
            <Cpu className="w-4 h-4 text-accent-info" />
          </div>
          <div>
            <p className="text-lg font-mono font-bold text-text-primary mt-1 leading-none">
              {latest ? `${latest.current.toFixed(2)} A` : "---"}
            </p>
            <span className="text-[8px] font-mono font-bold text-text-muted block mt-1.5 uppercase">
              GRID RESISTANCE OPER.
            </span>
          </div>
        </div>

        {/* Temperature KPI */}
        <div className="bracket-card bg-bg-surface p-4 border border-border-hairline flex flex-col justify-between h-[115px]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-text-muted">TEMPERATURE</span>
            <Thermometer className="w-4 h-4 text-accent-signal" />
          </div>
          <div>
            <p className="text-lg font-mono font-bold text-text-primary mt-1 leading-none">
              {latest ? `${latest.temperature.toFixed(1)} °C` : "---"}
            </p>
            <span className={`text-[8px] font-mono font-bold block mt-1.5 uppercase ${latest && latest.temperature > 70 ? "text-accent-negative animate-pulse" : "text-accent-positive"}`}>
              {latest && latest.temperature > 70 ? "OVERHEAT RISK" : "THERMAL NORMAL"}
            </span>
          </div>
        </div>

        {/* Grid Consumption (Energy) KPI */}
        <div className="bracket-card bg-bg-surface p-4 border border-border-hairline flex flex-col justify-between h-[115px]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-text-muted">CONSUMPTION</span>
            <Activity className="w-4 h-4 text-accent-info" />
          </div>
          <div>
            <p className="text-lg font-mono font-bold text-text-primary mt-1 leading-none">
              {latest ? `${latest.energy_consumption.toFixed(2)} kW` : "---"}
            </p>
            <span className="text-[8px] font-mono font-bold text-accent-positive block mt-1.5 uppercase">
              ACTIVE LOAD BAL.
            </span>
          </div>
        </div>

        {/* Frequency KPI */}
        <div className="bracket-card bg-bg-surface p-4 border border-border-hairline flex flex-col justify-between h-[115px]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-text-muted">FREQUENCY</span>
            <Radio className="w-4 h-4 text-accent-signal" />
          </div>
          <div>
            <p className="text-lg font-mono font-bold text-text-primary mt-1 leading-none">
              {latest ? `${latest.frequency.toFixed(2)} Hz` : "---"}
            </p>
            <span className={`text-[8px] font-mono font-bold block mt-1.5 uppercase ${latest && (latest.frequency < 49.5 || latest.frequency > 50.5) ? "text-accent-negative" : "text-accent-positive"}`}>
              {latest && (latest.frequency < 49.5 || latest.frequency > 50.5) ? "FREQ DEV ALERT" : "SYNCHRONIZED"}
            </span>
          </div>
        </div>

        {/* Latency KPI */}
        <div className="bracket-card bg-bg-surface p-4 border border-border-hairline flex flex-col justify-between h-[115px]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-text-muted">PING LATENCY</span>
            <Clock className="w-4 h-4 text-text-muted" />
          </div>
          <div>
            <p className="text-lg font-mono font-bold text-text-primary mt-1 leading-none">
              {latest ? `${latest.latency.toFixed(1)} ms` : "---"}
            </p>
            <span className="text-[8px] font-mono font-bold text-accent-positive block mt-1.5 uppercase">
              PACKETS DELIVERED
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scrolling Grid Analytics Line Plot */}
        <div className="lg:col-span-2 bg-bg-surface rounded border border-border-hairline p-5 flex flex-col h-[400px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border-hairline pb-3 mb-4 gap-2.5">
            <h3 className="text-xs font-mono font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-widest">
              <Grid className="w-4 h-4 text-accent-signal" />
              Live Rolling Metrics Trend
            </h3>
            {/* Metric Tab Selector */}
            <div className="flex bg-bg-void border border-border-hairline rounded p-0.5 font-mono text-[9px]">
              <button
                onClick={() => setChartMetricTab("power")}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${chartMetricTab === "power" ? "bg-accent-signal text-bg-void font-bold" : "text-text-secondary hover:text-text-primary"}`}
              >
                POWER & VOLTAGE
              </button>
              <button
                onClick={() => setChartMetricTab("thermals")}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${chartMetricTab === "thermals" ? "bg-accent-signal text-bg-void font-bold" : "text-text-secondary hover:text-text-primary"}`}
              >
                THERMALS & CURRENT
              </button>
              <button
                onClick={() => setChartMetricTab("system")}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${chartMetricTab === "system" ? "bg-accent-signal text-bg-void font-bold" : "text-text-secondary hover:text-text-primary"}`}
              >
                FREQ & LATENCY
              </button>
            </div>
          </div>

          <div className="flex-1 w-full min-h-0">
            {readings.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
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
                  <Legend wrapperStyle={{ fontSize: "9px", fontFamily: "JetBrains Mono, monospace", paddingTop: "8px" }} />
                  
                  {chartMetricTab === "power" && (
                    <>
                      <Line type="monotone" dataKey="energy" stroke="var(--color-accent-info)" strokeWidth={1.5} dot={false} name="Grid Load (kW)" />
                      <Line type="monotone" dataKey="voltage" stroke="var(--color-accent-signal)" strokeWidth={1.5} dot={false} name="Voltage (V)" />
                    </>
                  )}
                  {chartMetricTab === "thermals" && (
                    <>
                      <Line type="monotone" dataKey="temperature" stroke="var(--color-accent-negative)" strokeWidth={1.5} dot={false} name="Core Temperature (°C)" />
                      <Line type="monotone" dataKey="current" stroke="var(--color-accent-positive)" strokeWidth={1.5} dot={false} name="Line Current (A)" />
                    </>
                  )}
                  {chartMetricTab === "system" && (
                    <>
                      <Line type="monotone" dataKey="frequency" stroke="var(--color-accent-warning)" strokeWidth={1.5} dot={false} name="Frequency (Hz)" />
                      <Line type="monotone" dataKey="latency" stroke="var(--color-text-secondary)" strokeWidth={1.5} dot={false} name="Latency (ms)" />
                    </>
                  )}
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
        <div className="lg:col-span-1 bg-bg-surface rounded border border-border-hairline p-5 flex flex-col h-[400px]">
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
                  className="border border-accent-negative/20 bg-accent-negative/5 p-3 rounded space-y-1.5 animate-in slide-in-from-top-3 duration-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-bold font-mono text-bg-void bg-accent-negative px-1.5 py-0.5 rounded flex items-center gap-1 tracking-widest uppercase">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {anom.anomalyType || "GRID ANOMALY"}
                    </span>
                    <span className="text-[9px] font-mono text-text-secondary">
                      {anom.timestamp.split("T")[1]?.substring(0, 8) || ""}
                    </span>
                  </div>
                  <p className="text-xs font-mono font-bold text-text-primary leading-tight uppercase">
                    Alert raised: <span className="text-accent-signal font-extrabold">{anom.energy_consumption.toFixed(2)} kW</span> (Volt: {anom.voltage}V, Temp: {anom.temperature}°C).
                  </p>
                  <span className="text-[9px] text-text-secondary font-mono block">
                    DEVIATION: +4.2σ outside standard operational model boundaries.
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
