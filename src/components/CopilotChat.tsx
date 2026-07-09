import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Sparkles,
  Mic,
  RefreshCw,
  HelpCircle,
  TrendingUp,
  Brain,
  AlertTriangle,
  FileText
} from "lucide-react";
import { Dataset, User } from "../types";
import { Language, translations } from "../lib/translations";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import ReactMarkdown from "react-markdown";

interface Message {
  sender: "user" | "copilot";
  text: string;
  timestamp: Date;
  chartData?: any[];
  chartKeys?: { x: string; y: string[] };
  chartType?: "bar" | "line" | "pie";
  tableData?: any[];
}

interface CopilotChatProps {
  dataset: Dataset | null;
  projectId: string;
  lang: Language;
  user: User;
}

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function CopilotChat({ dataset, projectId, lang, user }: CopilotChatProps) {
  const t = translations[lang];

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <MessageSquare className="w-12 h-12 mb-3 text-slate-400 stroke-[1.2]" />
        <p className="text-sm">Please select a dataset to query the Copilot.</p>
      </div>
    );
  }

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "copilot",
      text: `Hello **${user.name}**! I am your **InsightForge AI Copilot**. I am fully synced with **"${dataset.name}"** (${dataset.rowCount} rows, ${dataset.colCount} columns).\n\nI can calculate **averages**, identify **outliers**, explain **SHAP weights**, build **correlations**, or perform **forecast summaries**.\n\nTry clicking one of the recommendation chips below!`,
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chips, setChips] = useState<string[]>([
    "Dataset Summary statistics",
    "Identify outliers & anomalies",
    "Average value of columns",
    "Explain SHAP weights & feature importance"
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = async (queryText: string) => {
    if (!queryText.trim()) return;

    // Add user message
    const userMsg: Message = {
      sender: "user",
      text: queryText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const token = localStorage.getItem("auth_token") || "";

      // Format conversation history for model context
      const chatHistory = messages.slice(1).map(m => ({
        role: m.sender === "user" ? ("user" as const) : ("model" as const),
        parts: [m.text]
      }));

      const res = await fetch(`/api/projects/${projectId}/dataset/${dataset.id}/copilot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          query: queryText,
          history: chatHistory
        })
      });

      if (res.ok) {
        const data = await res.json();

        const copilotMsg: Message = {
          sender: "copilot",
          text: data.text || data.explanation || "No insights found.",
          timestamp: new Date()
        };

        // Attach parsed chart data if returned
        if (data.chartData) {
          copilotMsg.chartData = data.chartData.data || data.chartData;
          copilotMsg.chartKeys = {
            x: data.chartData.xKey || "name",
            y: data.chartData.yKeys || ["value"]
          };
          copilotMsg.chartType = data.chartData.type || "bar";
        }

        // Attach table data
        if (data.tableData) {
          copilotMsg.tableData = data.tableData;
        }

        // Update suggestion chips with dynamic ones from model
        if (data.suggestions && data.suggestions.length > 0) {
          setChips(data.suggestions);
        }

        setMessages(prev => [...prev, copilotMsg]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            sender: "copilot",
            text: "I encountered an issue processing the query with the data modeling backend.",
            timestamp: new Date()
          }
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          sender: "copilot",
          text: "I encountered a communication timeout querying the modeling database.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleVoiceQuery = () => {
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      const voiceOutputs = [
        "What is the average correlation in this data?",
        "Show me any anomaly peaks in energy consumption.",
        "Give me an executive statistical summary of this dataset.",
        "List the top rows with potential outliers"
      ];
      const randomQuery = voiceOutputs[Math.floor(Math.random() * voiceOutputs.length)];
      setInput(randomQuery);
    }, 1500);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-h-[calc(100vh-100px)] overflow-hidden bg-bg-void border border-border-hairline rounded-xl">
      {/* Header Banner */}
      <div className="bg-bg-surface border-b border-border-hairline px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-5 h-5 text-accent-signal" />
          <div>
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide">Analytical Copilot</h3>
            <p className="text-[10px] text-text-secondary font-mono">POWERED BY GEMINI AI CORE</p>
          </div>
        </div>
        <div className="bg-accent-signal/10 border border-accent-signal/20 px-2.5 py-0.5 rounded text-[9px] font-mono font-bold text-accent-signal">
          CONTEXT: {dataset.name}
        </div>
      </div>

      {/* Message scroll list */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.map((m, idx) => {
          const isCopilot = m.sender === "copilot";
          return (
            <div key={idx} className={`flex ${isCopilot ? "justify-start" : "justify-end"} items-start gap-3`}>
              {isCopilot && (
                <div className="w-8 h-8 bg-accent-signal/15 border border-accent-signal/30 rounded-full flex items-center justify-center text-accent-signal shrink-0 mt-1">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
              )}
              <div className="space-y-2.5 max-w-[85%]">
                <div className={`p-4 rounded-lg text-xs leading-relaxed border shadow-sm ${
                  isCopilot
                    ? "bg-bg-surface border-border-hairline text-text-primary"
                    : "bg-accent-signal border-accent-signal text-bg-void font-medium"
                }`}>
                  <div className="prose prose-invert prose-sm max-w-none text-xs">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed font-sans">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2.5 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2.5 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="text-[11px] leading-normal">{children}</li>,
                        code: ({ children }) => <code className="bg-bg-void/60 text-accent-signal px-1 py-0.5 rounded text-[10px] font-mono">{children}</code>,
                        strong: ({ children }) => <strong className="font-bold text-text-primary">{children}</strong>,
                        h1: ({ children }) => <h1 className="text-sm font-bold border-b border-border-hairline pb-1 mb-2 mt-3">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-xs font-bold mb-1.5 mt-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-[11px] font-bold mb-1 mt-2">{children}</h3>,
                      }}
                    >
                      {m.text}
                    </ReactMarkdown>
                  </div>

                  {/* Render Table Data if available */}
                  {m.tableData && m.tableData.length > 0 && (
                    <div className="mt-3.5 border border-border-hairline rounded bg-bg-void overflow-hidden">
                      <div className="max-h-40 overflow-y-auto">
                        <table className="w-full text-[9px] font-mono text-left border-collapse">
                          <thead>
                            <tr className="bg-bg-surface-raised border-b border-border-hairline text-text-muted">
                              {Object.keys(m.tableData[0]).slice(0, 5).map((col, cIdx) => (
                                <th key={cIdx} className="px-2.5 py-1.5 font-bold uppercase">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {m.tableData.slice(0, 10).map((row, rIdx) => (
                              <tr key={rIdx} className="border-b border-border-hairline last:border-b-0 hover:bg-bg-surface/50 text-text-primary">
                                {Object.values(row).slice(0, 5).map((val: any, vIdx) => (
                                  <td key={vIdx} className="px-2.5 py-1.5 truncate max-w-[120px]">
                                    {typeof val === "number" ? val.toFixed(2) : String(val)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {m.tableData.length > 10 && (
                        <div className="text-[8px] text-text-muted px-2.5 py-1 border-t border-border-hairline bg-bg-surface-raised font-mono">
                          Showing top 10 of {m.tableData.length} records.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Inline visual charts for specific analysis */}
                  {m.chartData && m.chartData.length > 0 && m.chartKeys && (
                    <div className="mt-4 bg-bg-void border border-border-hairline p-4.5 rounded-lg h-44 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        {m.chartType === "line" ? (
                          <LineChart data={m.chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                            <XAxis dataKey={m.chartKeys.x} stroke="var(--color-text-secondary)" fontSize={8} tickLine={false} />
                            <YAxis stroke="var(--color-text-secondary)" fontSize={8} tickLine={false} />
                            <Tooltip contentStyle={{ fontSize: "9px", backgroundColor: "var(--color-bg-surface)", borderColor: "var(--color-border-hairline)" }} />
                            {m.chartKeys.y.map((yK, yIdx) => (
                              <Line key={yIdx} type="monotone" dataKey={yK} stroke={COLORS[yIdx % COLORS.length]} strokeWidth={1.5} dot={false} />
                            ))}
                          </LineChart>
                        ) : m.chartType === "pie" ? (
                          <PieChart>
                            <Pie
                              data={m.chartData}
                              cx="50%"
                              cy="50%"
                              outerRadius={55}
                              dataKey={m.chartKeys.y[0]}
                              nameKey={m.chartKeys.x}
                            >
                              {m.chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ fontSize: "9px" }} />
                          </PieChart>
                        ) : (
                          <BarChart data={m.chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                            <XAxis dataKey={m.chartKeys.x} stroke="var(--color-text-secondary)" fontSize={8} tickLine={false} />
                            <YAxis stroke="var(--color-text-secondary)" fontSize={8} tickLine={false} />
                            <Tooltip contentStyle={{ fontSize: "9px", backgroundColor: "var(--color-bg-surface)", borderColor: "var(--color-border-hairline)" }} />
                            {m.chartKeys.y.map((yK, yIdx) => (
                              <Bar key={yIdx} dataKey={yK} fill={COLORS[yIdx % COLORS.length]} radius={[2, 2, 0, 0]} />
                            ))}
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
                <span className={`text-[9px] text-text-muted font-mono block ${isCopilot ? "text-left" : "text-right"}`}>
                  {m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start items-center gap-3">
            <div className="w-8 h-8 bg-accent-signal/10 border border-accent-signal/20 rounded-full flex items-center justify-center text-accent-signal shrink-0">
              <Sparkles className="w-4 h-4 animate-spin text-accent-signal" />
            </div>
            <div className="bg-bg-surface border border-border-hairline rounded-lg p-4 text-xs text-text-secondary flex items-center gap-2 shadow-sm">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent-signal" />
              <span className="font-mono text-[10px]">Analyzing variables and preparing mathematical insight...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Dynamic Suggestion Chips */}
      <div className="px-6 py-2.5 bg-bg-surface border-t border-border-hairline flex gap-2 overflow-x-auto shrink-0">
        {chips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            className="bg-bg-void border border-border-hairline text-text-primary hover:border-accent-signal hover:text-accent-signal text-[10px] font-mono px-3.5 py-1.5 rounded-full whitespace-nowrap transition cursor-pointer shrink-0"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input panel */}
      <div className="p-4 bg-bg-surface border-t border-border-hairline shrink-0 flex items-center gap-3">
        {/* Voice Microphone simulation */}
        <button
          onClick={handleVoiceQuery}
          disabled={isListening}
          className={`p-2.5 rounded border transition ${
            isListening
              ? "bg-accent-negative/15 border-accent-negative/30 text-accent-negative animate-pulse"
              : "bg-bg-void border-border-hairline text-text-secondary hover:bg-bg-surface-raised cursor-pointer"
          }`}
          title={t.voiceQuery}
        >
          <Mic className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend(input);
          }}
          placeholder={isListening ? t.listening : "Ask Copilot: Average, Correlation, Outliers, SHAP explain..."}
          disabled={isListening}
          className="flex-1 bg-bg-void border border-border-hairline text-xs rounded py-2.5 px-3.5 text-text-primary placeholder-text-muted font-sans focus:outline-none focus:border-accent-signal"
        />

        <button
          onClick={() => handleSend(input)}
          className="bg-accent-signal hover:bg-accent-signal/90 text-bg-void p-2.5 rounded shadow-sm transition flex items-center justify-center shrink-0 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
