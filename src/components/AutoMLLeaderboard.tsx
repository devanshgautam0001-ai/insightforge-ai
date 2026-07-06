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
      const data = await res.json();
      if (res.ok) {
        onModelTrained(data);
      } else {
        alert(data.error || "Failed to execute training");
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
    <div className="space-y-6 max-h-[calc(100vh-64px)] overflow-y-auto p-1">
      {/* Title */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-500" />
            AutoML Model Registry & Leaderboard
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto-select hyperparameter parameters, run multi-model bagging, and track metrics.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ML Orchestration Panel */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-6 flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3 mb-2">
            <Cpu className="w-4 h-4 text-indigo-500" />
            AutoML Training Configuration
          </h3>

          <div className="space-y-4 flex-1">
            {/* Target Pick */}
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                {t.targetColumn}
              </label>
              <select
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                disabled={isTraining || user.role === "VIEWER"}
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg py-2 px-3 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                {t.problemType}
              </label>
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/50">
                {(["regression", "classification"] as ProblemType[]).map(pt => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => setProblemType(pt)}
                    disabled={isTraining || user.role === "VIEWER"}
                    className={`flex-1 text-center py-1.5 rounded-md text-xs font-bold capitalize transition ${
                      problemType === pt
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </div>

            {/* Training Stats summary preview */}
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 space-y-2 text-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Features Included</span>
              <p className="text-slate-600 font-medium">
                {dataset.columns.length - 1} continuous and categorical dimensions
              </p>
              <p className="text-[10px] text-slate-400 leading-normal">
                Features will automatically handle continuous OLS standardize and categorical hash-encoding split boundaries.
              </p>
            </div>
          </div>

          {/* Training Button */}
          {isTraining ? (
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 text-center space-y-3.5">
              <div className="flex justify-center">
                <Cpu className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-600">Executing AutoML Core...</p>
                <p className="text-[10px] text-slate-400 mt-1">
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
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${(trainingStep / 7) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={handleTrain}
              disabled={user.role === "VIEWER"}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5 mt-4 transition"
            >
              <Play className="w-4 h-4" />
              {t.trainModel}
            </button>
          )}
        </div>

        {/* Leaderboard Results Section */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 flex flex-col h-[520px]">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3 mb-4">
            <Trophy className="w-4 h-4 text-indigo-500" />
            Model Performance Leaderboard
          </h3>

          <div className="flex-1 overflow-y-auto space-y-4">
            {latestModel ? (
              <>
                {/* Active Model Summary Card */}
                <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-600 px-2 py-0.5 rounded font-bold uppercase">
                      Active Production
                    </span>
                    <h4 className="text-base font-extrabold text-slate-800">{latestModel.algorithm}</h4>
                    <p className="text-xs text-slate-400">
                      Optimized target: <strong className="text-slate-600">"{latestModel.targetColumn}"</strong>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {Object.entries(latestModel.metrics).map(([key, val]) => (
                      <div key={key} className="bg-white border border-slate-200/60 rounded-lg p-2.5 text-center min-w-[70px]">
                        <span className="text-[9px] uppercase font-mono font-bold tracking-wider text-slate-400">{key}</span>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Leaderboard List */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Cross-Validation Standings</span>
                  {latestModel.leaderboard.map((model, idx) => (
                    <div
                      key={idx}
                      className="border border-slate-100 p-3.5 rounded-lg flex items-center justify-between hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          idx === 0
                            ? "bg-amber-50 border border-amber-200 text-amber-600"
                            : idx === 1
                            ? "bg-slate-100 border border-slate-200 text-slate-500"
                            : "bg-slate-50 border border-slate-100 text-slate-400"
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700">{model.algorithm}</p>
                          <span className="text-[10px] text-slate-400 capitalize">{model.problemType} model</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold font-mono text-slate-800">
                          {getLeaderboardMetric(model.metrics)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Brain className="w-10 h-10 text-slate-300 mb-2 stroke-[1.2]" />
                <p className="text-xs">No models trained yet for this project.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Choose target and click 'Train Model' to initiate AutoML.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
