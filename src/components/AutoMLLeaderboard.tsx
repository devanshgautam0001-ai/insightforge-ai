/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Brain,
  Award,
  ChevronRight,
  TrendingUp,
  Cpu,
  Trophy,
  CheckCircle,
  AlertTriangle,
  Play
} from "lucide-react";
import { Dataset, ModelRun, User, ProblemType } from "../types";
import { Language, translations } from "../lib/translations";

interface AutoMLLeaderboardProps {
  dataset: Dataset | null;
  projectId: string;
  onModelTrained: (run: ModelRun) => void;
  latestModel: ModelRun | null;
  lang: Language;
  user: User;
}

export default function AutoMLLeaderboard({
  dataset,
  projectId,
  onModelTrained,
  latestModel,
  lang,
  user
}: AutoMLLeaderboardProps) {
  const t = translations[lang];

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <Brain className="w-12 h-12 mb-3 text-slate-400 stroke-[1.2]" />
        <p className="text-sm">Please select a dataset to train models.</p>
      </div>
    );
  }

  const [targetColumn, setTargetColumn] = useState<string>("");
  const [problemType, setProblemType] = useState<ProblemType>("regression");
  const [isTraining, setIsTraining] = useState(false);
  const [trainingStep, setTrainingStep] = useState(0);

  // Auto-detect target column and problem type on change
  useEffect(() => {
    // Look for common targets: "churn", "sales", "energy_consumption"
    let defaultTarget = dataset.columns[dataset.columns.length - 1]?.name || "";
    const foundTarget = dataset.columns.find(c =>
      c.name.includes("churn") || c.name.includes("sales") || c.name.includes("consumption")
    );
    if (foundTarget) defaultTarget = foundTarget.name;

    setTargetColumn(defaultTarget);
  }, [dataset]);

  useEffect(() => {
    if (!targetColumn) return;
    const col = dataset.columns.find(c => c.name === targetColumn);
    if (col) {
      if (col.type === "boolean" || (col.type === "categorical" && col.uniqueCount <= 10)) {
        setProblemType("classification");
      } else {
        setProblemType("regression");
      }
    }
  }, [targetColumn, dataset]);

  const handleTrain = async () => {
    if (user.role === "VIEWER") {
      alert("RBAC Restriction: Viewers are not authorized to train machine learning models.");
      return;
    }

    setIsTraining(true);
    setTrainingStep(1);

    // Run multi-phase visual simulation steps of ML training!
    const steps = [
      "Splitting dataset into 80/20 train-test folds...",
      "Normalizing variances and scaling numeric boundaries...",
      "Fitting Decision Trees & calculating Gini impurities...",
      "Running Gradient Descent on Sigmoid bounds (100 Epochs)...",
      "Validating models using 5-fold cross validation...",
      "Assembling performance metrics leaderboard..."
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setTrainingStep(i + 2);
    }

    try {
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch(`/api/projects/${projectId}/dataset/${dataset.id}/automl`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          targetColumn,
          problemType,
          userId: user.id
        })
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          onModelTrained(data);
        } else {
          alert("Handshake mismatch: AutoML pipeline did not return JSON.");
        }
      } else {
        let errorMsg = "Failed to execute training";
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
      alert("Network error initiating AutoML routing");
    } finally {
      setIsTraining(false);
      setTrainingStep(0);
    }
  };

  const getLeaderboardMetric = (metrics: any) => {
    if (problemType === "regression") {
      return `R²: ${metrics.r2 || "N/A"}`;
    }
    return `F1: ${metrics.f1Score || "N/A"}`;
  };

  return (
    <div className="space-y-6 max-h-[calc(100vh-100px)] overflow-y-auto p-1 pr-2">
      {/* Title */}
      <div className="bg-bg-surface rounded border border-border-hairline p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-sm font-display font-bold text-text-primary flex items-center gap-2 uppercase tracking-wide">
            <Brain className="w-5 h-5 text-accent-signal" />
            AutoML Model Registry & Leaderboard
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Auto-select hyperparameter parameters, run multi-model bagging, and track metrics.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ML Orchestration Panel */}
        <div className="lg:col-span-1 bg-bg-surface rounded border border-border-hairline p-5 space-y-6 flex flex-col">
          <h3 className="text-xs font-mono font-bold text-text-primary flex items-center gap-1.5 border-b border-border-hairline pb-3 mb-2 uppercase tracking-widest">
            <Cpu className="w-4 h-4 text-accent-signal" />
            AutoML Orchestrator
          </h3>

          <div className="space-y-4 flex-1">
            {/* Target Pick */}
            <div>
              <label className="block text-[9px] text-text-muted font-mono font-bold uppercase tracking-widest mb-1.5">
                {t.targetColumn}
              </label>
              <select
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                disabled={isTraining || user.role === "VIEWER"}
                className="w-full bg-bg-void border border-border-hairline text-xs font-mono rounded py-2 px-3 text-text-secondary focus:outline-none focus:border-accent-signal"
              >
                {dataset.columns.map(c => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Problem Type Override */}
            <div>
              <label className="block text-[9px] text-text-muted font-mono font-bold uppercase tracking-widest mb-1.5">
                {t.problemType}
              </label>
              <div className="flex bg-bg-void p-0.5 rounded border border-border-hairline">
                {(["regression", "classification"] as ProblemType[]).map(pt => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => setProblemType(pt)}
                    disabled={isTraining || user.role === "VIEWER"}
                    className={`flex-1 text-center py-1.5 rounded text-[10px] font-mono font-bold uppercase transition ${
                      problemType === pt
                        ? "bg-accent-signal text-bg-void"
                        : "text-text-muted hover:text-text-secondary animate-none"
                    }`}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </div>

            {/* Training Stats summary preview */}
            <div className="bg-bg-void border border-border-hairline rounded p-4 space-y-2 text-xs font-mono">
              <span className="text-[9px] text-text-muted font-bold uppercase block tracking-wider">Features Included</span>
              <p className="text-text-secondary">
                {dataset.columns.length - 1} continuous and categorical dimensions
              </p>
              <p className="text-[9px] text-text-muted leading-normal">
                Features will automatically handle continuous OLS standardize and categorical hash-encoding split boundaries.
              </p>
            </div>
          </div>

          {/* Training Button */}
          {isTraining ? (
            <div className="bg-bg-void border border-border-hairline rounded p-4 text-center space-y-3.5">
              <div className="flex justify-center">
                <Cpu className="w-8 h-8 text-accent-signal animate-spin" />
              </div>
              <div>
                <p className="text-xs font-mono font-bold text-accent-signal uppercase tracking-wider">Executing AutoML Core...</p>
                <p className="text-[10px] text-text-muted mt-1 font-mono uppercase">
                  {[
                    "Starting execution pipeline...",
                    "Splitting dataset into 80/20 train-test folds...",
                    "Normalizing variances and scaling numeric boundaries...",
                    "Fitting Decision Trees & calculating Gini impurities...",
                    "Running Gradient Descent on Sigmoid bounds (100 Epochs)...",
                    "Validating models using 5-fold cross validation...",
                    "Assembling performance metrics leaderboard..."
                  ][trainingStep - 1] || "Computing parameters..."}
                </p>
              </div>
              <div className="w-full bg-bg-surface h-1 rounded-full overflow-hidden">
                <div
                  className="bg-accent-signal h-1 rounded-full transition-all duration-300"
                  style={{ width: `${(trainingStep / 7) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={handleTrain}
              disabled={user.role === "VIEWER"}
              className="w-full bg-accent-signal hover:bg-accent-signal/90 disabled:bg-bg-void disabled:text-text-muted text-bg-void font-mono font-bold text-[10px] uppercase tracking-wider py-2.5 px-4 rounded transition cursor-pointer"
            >
              <Play className="w-4 h-4" />
              {t.trainModel.toUpperCase()}
            </button>
          )}
        </div>

        {/* Leaderboard Results Section */}
        <div className="lg:col-span-2 bg-bg-surface rounded border border-border-hairline p-5 flex flex-col h-[520px]">
          <h3 className="text-xs font-mono font-bold text-text-primary flex items-center gap-1.5 border-b border-border-hairline pb-3 mb-4 uppercase tracking-widest">
            <Trophy className="w-4 h-4 text-accent-signal" />
            Model Performance Leaderboard
          </h3>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {latestModel ? (
              <>
                {/* Active Model Summary Card */}
                <div className="bg-bg-void border border-border-hairline p-4 rounded flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[8px] bg-accent-positive/10 border border-accent-positive/20 text-accent-positive px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                      Active Production
                    </span>
                    <h4 className="text-sm font-mono font-bold text-text-primary">{latestModel.algorithm}</h4>
                    <p className="text-xs text-text-secondary font-mono">
                      Optimized target: <strong className="text-accent-signal">"{latestModel.targetColumn}"</strong>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {Object.entries(latestModel.metrics).map(([key, val]) => (
                      <div key={key} className="bg-bg-surface border border-border-hairline rounded p-2 text-center min-w-[70px]">
                        <span className="text-[8px] uppercase font-mono font-bold tracking-wider text-text-muted">{key}</span>
                        <p className="text-xs font-mono font-bold text-text-primary mt-0.5">
                          {typeof val === "number" ? val.toFixed(4) : val}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Leaderboard List */}
                <div className="space-y-2">
                  <span className="text-[9px] text-text-muted font-mono font-bold uppercase tracking-wider block mb-2">Cross-Validation Standings</span>
                  {latestModel.leaderboard.map((model, idx) => (
                    <div
                      key={idx}
                      className="border border-border-hairline p-3.5 rounded bg-bg-void flex items-center justify-between hover:bg-bg-void/70 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                          idx === 0
                            ? "bg-accent-signal/20 border border-accent-signal/35 text-accent-signal"
                            : idx === 1
                            ? "bg-bg-surface border border-border-hairline text-text-secondary"
                            : "bg-bg-surface/50 border border-border-hairline/50 text-text-muted"
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-xs font-mono font-bold text-text-primary">{model.algorithm}</p>
                          <span className="text-[9px] text-text-muted font-mono uppercase tracking-wider">{model.problemType} model</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold font-mono text-text-primary">
                          {getLeaderboardMetric(model.metrics)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-text-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-text-secondary font-mono">
                <Brain className="w-10 h-10 text-text-muted mb-2 stroke-[1.2]" />
                <p className="text-[10px] uppercase tracking-widest text-text-primary">No Trained Models</p>
                <p className="text-[9px] text-text-muted mt-0.5 uppercase">Choose target and click 'Train Model' to initiate AutoML.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
