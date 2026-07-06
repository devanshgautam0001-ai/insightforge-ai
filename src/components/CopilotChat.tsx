/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  AlertTriangle
} from "lucide-react";
import { Dataset, User } from "../types";
import { Language, translations } from "../lib/translations";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";

interface Message {
  sender: "user" | "copilot";
  text: string;
  timestamp: Date;
  chartData?: any[];
  chartKeys?: { x: string; y: string };
}

interface CopilotChatProps {
  dataset: Dataset | null;
  projectId: string;
  lang: Language;
  user: User;
}

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
      text: `Hello ${user.name}! I am your InsightForge Copilot. I can query columns, calculate standard deviations, explain model weights, or find anomalies. Ask me anything about "${dataset.name}"!`,
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestionChips = [
    { label: "Find outliers & anomalies", query: "Can you scan for anomalous readings in this dataset?" },
    { label: "Correlations with consumption", query: "What is the relationship or correlation between variables?" },
    { label: "Summarize dataset", query: "Give me an executive statistical summary of this dataset." }
  ];

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
      const res = await fetch(`/api/projects/${projectId}/dataset/${dataset.id}/copilot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ query: queryText })
      });
      const data = await res.json();
      if (res.ok) {
        const copilotMsg: Message = {
          sender: "copilot",
          text: data.answer,
          timestamp: new Date()
        };

        // Attach parsed chart data if Copilot output suggests dynamic plotting
        if (data.chartData && data.chartKeys) {
          copilotMsg.chartData = data.chartData;
          copilotMsg.chartKeys = data.chartKeys;
        }

        setMessages(prev => [...prev, copilotMsg]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            sender: "copilot",
            text: "My telemetry layers returned an invalid handshake. Please verify connectivity or secrets configurations.",
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
    // Simulate listening speech translation
    setTimeout(() => {
      setIsListening(false);
      const voiceOutputs = [
        "What is the average correlation in this data?",
        "Show me any anomaly peaks in energy consumption.",
        "Give me an executive statistical summary of this dataset."
      ];
      const randomQuery = voiceOutputs[Math.floor(Math.random() * voiceOutputs.length)];
      setInput(randomQuery);
    }, 2800);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-h-[calc(100vh-100px)] overflow-hidden bg-slate-50 border border-slate-200/80 rounded-xl shadow-sm">
      {/* Header Banner */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-500" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">Analytical Copilot</h3>
            <p className="text-[10px] text-slate-400 font-mono">POWERED BY GEMINI AI CORE</p>
          </div>
        </div>
      </div>

      {/* Message scroll list */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m, idx) => {
          const isCopilot = m.sender === "copilot";
          return (
            <div key={idx} className={`flex ${isCopilot ? "justify-start" : "justify-end"} items-start gap-3`}>
              {isCopilot && (
                <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-600 shrink-0 mt-1">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}
              <div className="space-y-2 max-w-[85%]">
                <div className={`p-4 rounded-xl text-xs leading-relaxed border ${
                  isCopilot
                    ? "bg-white border-slate-200/60 text-slate-700 shadow-sm"
                    : "bg-indigo-600 border-indigo-700 text-white shadow-sm"
                }`}>
                  <p className="whitespace-pre-line">{m.text}</p>

                  {/* Inline visual charts for specific analysis */}
                  {m.chartData && m.chartKeys && (
                    <div className="mt-4 bg-slate-50 border border-slate-100 p-4 rounded-lg h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={m.chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                          <XAxis dataKey={m.chartKeys.x} stroke="#94a3b8" fontSize={9} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                          <Tooltip contentStyle={{ fontSize: "10px" }} />
                          <Bar dataKey={m.chartKeys.y} fill="#4f46e5" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
                <span className={`text-[9px] text-slate-400 block ${isCopilot ? "text-left" : "text-right"}`}>
                  {m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start items-center gap-3">
            <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-600 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200/60 rounded-xl p-4 text-xs text-slate-400 flex items-center gap-1.5 shadow-sm">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              <span>Analyzing variables and preparing advice...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      <div className="px-6 py-2.5 bg-slate-100 border-t border-slate-200/50 flex gap-2 overflow-x-auto shrink-0">
        {suggestionChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip.query)}
            className="bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 text-[10px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap transition cursor-pointer shrink-0"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input panel */}
      <div className="p-4 bg-white border-t border-slate-100 shrink-0 flex items-center gap-3">
        {/* Voice Microphone simulation */}
        <button
          onClick={handleVoiceQuery}
          disabled={isListening}
          className={`p-2.5 rounded-lg border transition ${
            isListening
              ? "bg-red-50 border-red-200 text-red-500 animate-pulse"
              : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
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
          placeholder={isListening ? t.listening : "Ask Copilot about correlations, anomalies, or statistical averages..."}
          disabled={isListening}
          className="flex-1 bg-slate-50 border border-slate-200 text-xs rounded-lg py-2.5 px-3.5 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />

        <button
          onClick={() => handleSend(input)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-lg shadow-md shadow-indigo-600/10 transition flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
