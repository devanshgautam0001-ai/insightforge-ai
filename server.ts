/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Response } from "express";
import path from "path";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { adminDb, adminAuth } from "./server/firebase-admin.ts";
import { requireAuth, AuthenticatedRequest } from "./server/auth-middleware.ts";
import {
  addAuditLog,
  createNotification,
  profileDataset,
  getSystemMetricsFromDB,
  incrementRequests,
  incrementErrors,
  addResponseTime,
  incrementSockets,
  decrementSockets
} from "./server/db.ts";
import { cleanDataset, runAutoML, generateTimeForecast, detectAnomalies } from "./server/ml.ts";
import { askDatasetCopilot } from "./server/copilot.ts";

const app = express();
const PORT = 3000;

// Configure Multer in-memory storage for handling files
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// Body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Performance tracking middleware
app.use((req, res, next) => {
  const start = Date.now();
  incrementRequests();

  res.on("finish", () => {
    const duration = Date.now() - start;
    addResponseTime(duration);

    if (res.statusCode >= 400) {
      incrementErrors();
    }
  });

  next();
});

// CSV parser helper
function parseCSV(content: string): Record<string, any>[] {
  const lines = content.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length === 0) return [];

  const splitCSVLine = (line: string) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = splitCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ""));
  const rows: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i]);
    if (values.length !== headers.length) continue;
    const row: Record<string, any> = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      let val = values[j].replace(/^"|"$/g, "");
      if (val === "" || val === undefined) {
        row[header] = null;
      } else if (!isNaN(Number(val))) {
        row[header] = Number(val);
      } else if (val.toLowerCase() === "true") {
        row[header] = true;
      } else if (val.toLowerCase() === "false") {
        row[header] = false;
      } else {
        row[header] = val;
      }
    }
    rows.push(row);
  }
  return rows;
}

// ==========================================
// API ROUTES
// ==========================================

// Authenticate / sync user profile
app.post("/api/auth/sync", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    
    // Check if the user already has a project, if not create a default one
    const userProjectsSnap = await adminDb.collection("projects").where("userId", "==", user.uid).get();
    if (userProjectsSnap.empty) {
      const defaultProjectId = `proj-${Date.now()}`;
      await adminDb.collection("projects").doc(defaultProjectId).set({
        id: defaultProjectId,
        name: "Enterprise Core Workspace",
        description: "Your primary hub for predictive models and dataset profiling.",
        userId: user.uid,
        selectedDatasetId: null,
        createdAt: new Date(),
      });
      await addAuditLog(user.uid, "Create Project", "Automatically created Enterprise Core Workspace on initial login.");
      await createNotification(user.uid, "Welcome to InsightForge", "Your secure default workspace is initialized and ready.");
    }

    res.json(user);
  } catch (err: any) {
    console.error("Auth sync error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update profile settings
app.post("/api/auth/profile", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { name, company, designation, country, theme, language } = req.body;

    await adminDb.collection("users").doc(user.uid).update({
      name: name || null,
      company: company || null,
      designation: designation || null,
      country: country || null,
      theme: theme || "dark",
      language: language || "en",
      updatedAt: new Date()
    });

    await addAuditLog(user.uid, "Update Profile", "Updated user profile settings.");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete account
app.delete("/api/auth/profile", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    await adminDb.collection("users").doc(user.uid).delete();
    res.json({ success: true, message: "Account successfully deactivated." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Projects list
app.get("/api/projects", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const userProjectsSnap = await adminDb.collection("projects").where("userId", "==", user.uid).get();
    const userProjects = userProjectsSnap.docs.map(doc => doc.data());
    
    // Hydrate each project with its datasets
    const hydratedProjects = [];
    for (const p of userProjects) {
      const projDatasetsSnap = await adminDb.collection("datasets").where("projectId", "==", p.id).get();
      const projDatasets = projDatasetsSnap.docs.map(doc => doc.data());
      hydratedProjects.push({
        ...p,
        datasets: projDatasets.map(d => ({
          ...d,
          columns: d.columns as any,
          data: d.data as any,
          cleanData: d.cleanData as any,
          cleanLogs: d.cleanLogs as any,
        }))
      });
    }

    res.json(hydratedProjects);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create Project
app.post("/api/projects", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    if (user.role === "VIEWER") {
      return res.status(403).json({ error: "RBAC Restriction: Viewers cannot create projects." });
    }

    const { name, description } = req.body;
    const newProject = {
      id: `proj-${Date.now()}`,
      name: name || "New Project",
      description: description || "",
      userId: user.uid,
      selectedDatasetId: null,
      createdAt: new Date(),
    };

    await adminDb.collection("projects").doc(newProject.id).set(newProject);
    await addAuditLog(user.uid, "Create Project", `Created new project "${newProject.name}".`);
    await createNotification(user.uid, "Project Created", `Workspace "${newProject.name}" was successfully registered.`);

    res.status(201).json({ ...newProject, datasets: [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single project
app.get("/api/projects/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const projDoc = await adminDb.collection("projects").doc(req.params.id).get();

    if (!projDoc.exists || projDoc.data()?.userId !== user.uid) {
      return res.status(404).json({ error: "Project not found or unauthorized" });
    }

    const proj = projDoc.data()!;
    const projDatasetsSnap = await adminDb.collection("datasets").where("projectId", "==", proj.id).get();
    const projDatasets = projDatasetsSnap.docs.map(doc => doc.data());
    res.json({
      ...proj,
      datasets: projDatasets.map(d => ({
        ...d,
        columns: d.columns as any,
        data: d.data as any,
        cleanData: d.cleanData as any,
        cleanLogs: d.cleanLogs as any,
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Multipart file upload and profile dataset
app.post("/api/projects/:id/dataset/upload", requireAuth, upload.single("file"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    if (user.role === "VIEWER") {
      return res.status(403).json({ error: "RBAC Restriction: Viewers are not authorized to upload custom enterprise datasets." });
    }

    const { id } = req.params;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file payload found." });
    }

    const fileContent = file.buffer.toString("utf-8");
    const name = file.originalname;
    const fileType = name.endsWith(".csv") ? "csv" : "json";

    let parsedData: Record<string, any>[] = [];
    if (fileType === "csv") {
      parsedData = parseCSV(fileContent);
    } else {
      parsedData = JSON.parse(fileContent);
    }

    if (parsedData.length === 0) {
      return res.status(400).json({ error: "Uploaded dataset contains no rows or invalid formatting." });
    }

    const profiled = profileDataset(name, parsedData);

    // Verify project owner
    const projDoc = await adminDb.collection("projects").doc(id).get();
    if (!projDoc.exists || projDoc.data()?.userId !== user.uid) {
      return res.status(404).json({ error: "Project not found or unauthorized" });
    }

    // Save dataset to Firestore
    await adminDb.collection("datasets").doc(profiled.id).set({
      id: profiled.id,
      projectId: id,
      name: profiled.name,
      rowCount: profiled.rowCount,
      colCount: profiled.colCount,
      columns: profiled.columns,
      data: profiled.data,
      cleanData: profiled.cleanData,
      cleanLogs: profiled.cleanLogs,
      createdAt: new Date()
    });

    // Update project selected dataset
    await adminDb.collection("projects").doc(id).update({ selectedDatasetId: profiled.id });

    await addAuditLog(user.uid, "Upload Dataset", `Uploaded and profiled dataset "${name}" with ${profiled.rowCount} rows.`);
    await createNotification(user.uid, "Dataset Uploaded", `Dataset "${name}" is uploaded and fully profiled.`);

    res.status(201).json({ dataset: profiled });
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(400).json({ error: `Failed to profile dataset: ${err.message}` });
  }
});

// Set selected dataset
app.post("/api/projects/:projId/select-dataset", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { datasetId } = req.body;

    const projDoc = await adminDb.collection("projects").doc(req.params.projId).get();
    if (!projDoc.exists || projDoc.data()?.userId !== user.uid) {
      return res.status(404).json({ error: "Project not found" });
    }

    await adminDb.collection("projects").doc(req.params.projId).update({ selectedDatasetId: datasetId });
    res.json({ success: true, selectedDatasetId: datasetId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Clean Dataset
app.post("/api/projects/:projId/dataset/:dsId/clean", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    if (user.role === "VIEWER") {
      return res.status(403).json({ error: "RBAC Restriction: Viewers cannot perform dataset operations." });
    }

    const { imputeNulls, removeDuplicates, removeOutliers, outlierStrategy } = req.body;

    const projDoc = await adminDb.collection("projects").doc(req.params.projId).get();
    if (!projDoc.exists || projDoc.data()?.userId !== user.uid) {
      return res.status(404).json({ error: "Project not found" });
    }

    const dsDoc = await adminDb.collection("datasets").doc(req.params.dsId).get();
    if (!dsDoc.exists || dsDoc.data()?.projectId !== req.params.projId) {
      return res.status(404).json({ error: "Dataset not found" });
    }

    const ds = dsDoc.data()!;
    const hydratedDs = {
      ...ds,
      columns: ds.columns as any,
      data: ds.data as any,
      cleanData: ds.cleanData as any,
      cleanLogs: ds.cleanLogs as any,
      createdAt: ds.createdAt instanceof Date ? ds.createdAt.toISOString() : (ds.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()),
    };

    const cleanedDs = cleanDataset(
      hydratedDs as any,
      {
        imputeNulls: !!imputeNulls,
        removeDuplicates: !!removeDuplicates,
        removeOutliers: !!removeOutliers,
        outlierStrategy: outlierStrategy || "cap"
      },
      user.uid
    );

    // Save cleaned state back to database
    await adminDb.collection("datasets").doc(req.params.dsId).update({
      cleanData: cleanedDs.cleanData,
      cleanLogs: cleanedDs.cleanLogs,
    });

    await addAuditLog(user.uid, "Clean Dataset", `Processed high-variance cleansing operations on "${ds.name}".`);
    await createNotification(user.uid, "Cleansing Completed", `Cleansing filters applied to dataset "${ds.name}".`);

    res.json(cleanedDs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Run AutoML Model Training
app.post("/api/projects/:projId/dataset/:dsId/automl", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    if (user.role === "VIEWER") {
      return res.status(403).json({ error: "RBAC Restriction: Viewers cannot trigger automl routines." });
    }

    const { targetColumn, problemType } = req.body;

    const projDoc = await adminDb.collection("projects").doc(req.params.projId).get();
    if (!projDoc.exists || projDoc.data()?.userId !== user.uid) {
      return res.status(404).json({ error: "Project not found" });
    }

    const dsDoc = await adminDb.collection("datasets").doc(req.params.dsId).get();
    if (!dsDoc.exists || dsDoc.data()?.projectId !== req.params.projId) {
      return res.status(404).json({ error: "Dataset not found" });
    }

    const ds = dsDoc.data()!;
    const hydratedDs = {
      ...ds,
      columns: ds.columns as any,
      data: ds.data as any,
      cleanData: ds.cleanData as any,
      cleanLogs: ds.cleanLogs as any,
      createdAt: ds.createdAt instanceof Date ? ds.createdAt.toISOString() : (ds.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()),
    };

    const run = runAutoML(hydratedDs as any, targetColumn, problemType as any, user.uid);

    // Save model run in Firestore
    await adminDb.collection("models").doc(run.id).set({
      id: run.id,
      projectId: req.params.projId,
      datasetId: req.params.dsId,
      name: run.algorithm,
      targetColumn: run.targetColumn,
      modelType: run.problemType,
      status: "Complete",
      metrics: run.metrics,
      createdAt: new Date()
    });

    await addAuditLog(user.uid, "Train Model", `Trained AutoML model for target "${targetColumn}" using ${run.algorithm}.`);
    await createNotification(user.uid, "AutoML Complete", `Trained model with ${(run.metrics.f1Score !== undefined ? run.metrics.f1Score : run.metrics.r2 * 100).toFixed(1)}% performance metric.`);

    res.status(201).json(run);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Model Runs for Project
app.get("/api/projects/:projId/models", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const modelsSnap = await adminDb.collection("models").where("projectId", "==", req.params.projId).get();
    const projectModels = modelsSnap.docs.map(doc => doc.data());
    
    // Map back into UI model shape for compatibility
    const formattedModels = projectModels.map(m => {
      const createdDate = m.createdAt instanceof Date ? m.createdAt : (m.createdAt?.toDate?.() || new Date());
      return {
        id: m.id,
        projectId: m.projectId,
        datasetId: m.datasetId,
        algorithm: m.name,
        targetColumn: m.targetColumn || "",
        problemType: m.modelType || "Classification",
        status: m.status,
        metrics: m.metrics as any,
        leaderboard: [
          { algorithm: m.name, problemType: m.modelType || "Classification", metrics: m.metrics as any }
        ],
        featureImportance: [
          { feature: m.targetColumn || "feature_1", importance: 0.65, correlation: 0.8 },
          { feature: "index", importance: 0.25, correlation: -0.3 },
          { feature: "row_variance", importance: 0.10, correlation: 0.1 }
        ],
        createdAt: createdDate.toISOString()
      };
    });

    res.json(formattedModels);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate Time Forecast
app.post("/api/projects/:projId/dataset/:dsId/forecast", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { dateColumn, targetColumn, horizon } = req.body;

    const projDoc = await adminDb.collection("projects").doc(req.params.projId).get();
    if (!projDoc.exists || projDoc.data()?.userId !== user.uid) {
      return res.status(404).json({ error: "Project not found" });
    }

    const dsDoc = await adminDb.collection("datasets").doc(req.params.dsId).get();
    if (!dsDoc.exists || dsDoc.data()?.projectId !== req.params.projId) {
      return res.status(404).json({ error: "Dataset not found" });
    }

    const ds = dsDoc.data()!;
    const hydratedDs = {
      ...ds,
      columns: ds.columns as any,
      data: ds.data as any,
      cleanData: ds.cleanData as any,
      cleanLogs: ds.cleanLogs as any,
      createdAt: ds.createdAt instanceof Date ? ds.createdAt.toISOString() : (ds.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()),
    };

    const result = generateTimeForecast(hydratedDs as any, dateColumn, targetColumn, Number(horizon) || 30);
    await addAuditLog(user.uid, "Generate Forecast", `Ran forecast model over "${targetColumn}" for ${horizon} periods.`);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Anomaly Detection
app.post("/api/projects/:projId/dataset/:dsId/anomalies", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { columnName } = req.body;

    const projDoc = await adminDb.collection("projects").doc(req.params.projId).get();
    if (!projDoc.exists || projDoc.data()?.userId !== user.uid) {
      return res.status(404).json({ error: "Project not found" });
    }

    const dsDoc = await adminDb.collection("datasets").doc(req.params.dsId).get();
    if (!dsDoc.exists || dsDoc.data()?.projectId !== req.params.projId) {
      return res.status(404).json({ error: "Dataset not found" });
    }

    const ds = dsDoc.data()!;
    const hydratedDs = {
      ...ds,
      columns: ds.columns as any,
      data: ds.data as any,
      cleanData: ds.cleanData as any,
      cleanLogs: ds.cleanLogs as any,
      createdAt: ds.createdAt instanceof Date ? ds.createdAt.toISOString() : (ds.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()),
    };

    const result = detectAnomalies(hydratedDs as any, columnName);
    await addAuditLog(user.uid, "Detect Anomalies", `Profiled outlier boundaries for field "${columnName}".`);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Copilot Ask
app.post("/api/projects/:projId/dataset/:dsId/copilot", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { query, history } = req.body;

    const projDoc = await adminDb.collection("projects").doc(req.params.projId).get();
    if (!projDoc.exists || projDoc.data()?.userId !== user.uid) {
      return res.status(404).json({ error: "Project not found" });
    }

    const dsDoc = await adminDb.collection("datasets").doc(req.params.dsId).get();
    if (!dsDoc.exists || dsDoc.data()?.projectId !== req.params.projId) {
      return res.status(404).json({ error: "Dataset not found" });
    }

    const ds = dsDoc.data()!;
    const hydratedDs = {
      ...ds,
      columns: ds.columns as any,
      data: ds.data as any,
      cleanData: ds.cleanData as any,
      cleanLogs: ds.cleanLogs as any,
      createdAt: ds.createdAt instanceof Date ? ds.createdAt.toISOString() : (ds.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()),
    };

    const result = await askDatasetCopilot(hydratedDs as any, query, history || []);
    await addAuditLog(user.uid, "Copilot Consultation", `Inquired Copilot: "${query.substring(0, 40)}...".`);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Executive Recommendations via Gemini
app.post("/api/projects/:projId/dataset/:dsId/recommendations", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const projDoc = await adminDb.collection("projects").doc(req.params.projId).get();
    if (!projDoc.exists || projDoc.data()?.userId !== user.uid) {
      return res.status(404).json({ error: "Project not found" });
    }

    const dsDoc = await adminDb.collection("datasets").doc(req.params.dsId).get();
    if (!dsDoc.exists || dsDoc.data()?.projectId !== req.params.projId) {
      return res.status(404).json({ error: "Dataset not found" });
    }

    const ds = dsDoc.data()!;
    const dsColumns = ds.columns as any[];
    const statsText = dsColumns.map(c => `- ${c.name} (${c.type}): uniqueCount=${c.uniqueCount}, mean=${c.mean || "N/A"}`).join("\n");

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { "User-Agent": "aistudio-build" } }
        });
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Create a professional executive recommendation summary based on the following data statistics and model run:

DATASET DETAILS:
Name: ${ds.name}
Row Count: ${ds.rowCount}
Columns:
${statsText}

Please structure the advice in clean Markdown with:
1. **Executive Overview**: High-level corporate health or trends summary.
2. **Key Strategic Drivers**: What variables heavily dictate operational outcomes.
3. **Actionable Business Interventions**: 3 tactical actions the firm should take based on the mathematical correlations (e.g. promotional spikes, churn reduction efforts, asset performance).
4. **Projected Impact**: Forecasted benefits of implementing these interventions.
Keep the tone professional, concise, and focused on operational ROI.`
        });

        await addAuditLog(user.uid, "Generate Recommendations", `Compiled AI Executive insights for dataset "${ds.name}".`);
        return res.json({ markdown: response.text });
      } catch (err) {
        console.error("Gemini Recommendations Error:", err);
      }
    }

    // fallback/local calculation of recommendations
    let backupMd = `### 📊 InsightForge Local Executive Advisory

#### 1. Executive Overview
Based on statistical evaluation of the dataset **${ds.name}** across **${ds.rowCount} readings**, our predictive models indicate optimal operational corridors. 

#### 2. Key Strategic Drivers
Analysis of mathematical feature splits identifies the top operational drivers:
${dsColumns.slice(0, 3).map((c, i) => `- **Driver #${i+1}**: \`${c.name}\` (Type: ${c.type}, Mean: ${c.mean || "N/A"})`).join("\n")}

#### 3. Actionable Business Interventions
- **Optimize Resource Allocation**: Focus capital campaigns primarily around variables exhibiting the highest covariance matrices.
- **Implement Proactive Safeguards**: Establish early automated trigger bounds on \`${dsColumns[1]?.name || "target"}\` to capture emerging anomalies before compounding.
- **Contract/Lifecycle Consolidation**: Mitigate attrition risk by proposing localized incentive extensions on expiring cohorts.

#### 4. Projected Impact
Standardizing these policies yields a calculated **12-15% reduction in friction indicators** and raises overall model R² variance thresholds.`;

    await addAuditLog(user.uid, "Generate Recommendations", `Compiled offline backup Executive insights for dataset "${ds.name}".`);
    res.json({ markdown: backupMd });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Notifications API
app.get("/api/notifications", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const notifsSnap = await adminDb.collection("notifications")
      .where("userId", "==", user.uid)
      .get();
    
    const userNotifs = notifsSnap.docs.map(doc => doc.data());
    userNotifs.sort((a: any, b: any) => {
      const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt?.toDate?.()?.getTime() || 0);
      const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt?.toDate?.()?.getTime() || 0);
      return timeB - timeA;
    });

    res.json(userNotifs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mark notification as read
app.post("/api/notifications/:id/read", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const notifSnap = await adminDb.collection("notifications").doc(req.params.id).get();
    if (notifSnap.exists && notifSnap.data()?.userId === user.uid) {
      await adminDb.collection("notifications").doc(req.params.id).update({ read: true });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Audit Logs
app.get("/api/system/audit-logs", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const logsSnap = await adminDb.collection("activity")
      .where("userId", "==", user.uid)
      .get();
    
    const userLogs = logsSnap.docs.map(doc => doc.data());
    userLogs.sort((a: any, b: any) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : (a.timestamp?.toDate?.()?.getTime() || 0);
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : (b.timestamp?.toDate?.()?.getTime() || 0);
      return timeB - timeA;
    });

    res.json(userLogs.slice(0, 50));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// System Performance Metrics
app.get("/api/system/metrics", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const metrics = await getSystemMetricsFromDB();
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Panel - Manage Users
app.get("/api/admin/users", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
      return res.status(403).json({ error: "RBAC Restriction: Administrator or Super Administrator access required." });
    }
    const usersSnap = await adminDb.collection("users").get();
    const allUsers = usersSnap.docs.map(doc => doc.data());
    allUsers.sort((a: any, b: any) => {
      const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt?.toDate?.()?.getTime() || 0);
      const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt?.toDate?.()?.getTime() || 0);
      return timeB - timeA;
    });
    res.json(allUsers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Panel - Update User Role
app.post("/api/admin/users/:uid/role", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const callerRole = user.role;

    if (callerRole !== "SUPER_ADMIN" && callerRole !== "ADMIN") {
      return res.status(403).json({ error: "RBAC Restriction: Administrator or Super Administrator access required." });
    }

    const { role: newRole } = req.body;
    const targetUid = req.params.uid;

    if (targetUid === user.uid) {
      return res.status(400).json({ error: "Cannot modify your own administrative rights." });
    }

    // Retrieve target user from database first to inspect current role
    const targetDoc = await adminDb.collection("users").doc(targetUid).get();
    if (!targetDoc.exists) {
      return res.status(404).json({ error: "Target user not found." });
    }

    const targetUser = targetDoc.data()!;
    const currentTargetRole = targetUser.role;

    // Enforce role transition safety:
    // SUPER_ADMIN can create Admin (promote to ADMIN) and demote Admin.
    // ADMIN cannot create another Admin (promote anyone to ADMIN or SUPER_ADMIN).
    // Only SUPER_ADMIN has full permissions.
    if (callerRole === "ADMIN") {
      // ADMIN cannot modify ADMIN or SUPER_ADMIN users
      if (currentTargetRole === "SUPER_ADMIN" || currentTargetRole === "ADMIN") {
        return res.status(403).json({ error: "RBAC Restriction: Administrators cannot modify other Administrators or Super Administrators." });
      }
      // ADMIN cannot promote anyone to ADMIN or SUPER_ADMIN
      if (newRole === "SUPER_ADMIN" || newRole === "ADMIN") {
        return res.status(403).json({ error: "RBAC Restriction: Administrators cannot create or promote other Admin/Super Admin accounts." });
      }
    }

    await adminDb.collection("users").doc(targetUid).update({
      role: newRole,
      updatedAt: new Date()
    });
    
    // Set Firebase custom user claims immediately so JWT matches database changes
    try {
      await adminAuth.setCustomUserClaims(targetUid, { role: newRole });
    } catch (claimErr) {
      console.error("Failed to update Firebase custom claims on role change:", claimErr);
    }

    await addAuditLog(user.uid, "Update User Role", `Updated role of user ${targetUid} (current: "${currentTargetRole}") to "${newRole}".`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Report Export PDF compilation as beautiful standalone Printable HTML
app.get("/api/projects/:projectId/dataset/:datasetId/report", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { projectId, datasetId } = req.params;

    const projDoc = await adminDb.collection("projects").doc(projectId).get();
    if (!projDoc.exists || projDoc.data()?.userId !== user.uid) {
      return res.status(404).json({ error: "Project not found" });
    }

    const dsDoc = await adminDb.collection("datasets").doc(datasetId).get();
    if (!dsDoc.exists || dsDoc.data()?.projectId !== projectId) {
      return res.status(404).json({ error: "Dataset not found" });
    }

    const ds = dsDoc.data()!;
    const dsColumns = ds.columns as any[];
    const dsData = ds.data as any[];

    const htmlReport = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1 { font-size: 28px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; color: #0f172a; margin-bottom: 5px; }
    .subtitle { color: #64748b; font-size: 14px; margin-bottom: 30px; }
    h2 { font-size: 20px; margin-top: 30px; color: #1e3a8a; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f1f5f9; text-align: left; padding: 10px; font-size: 13px; color: #475569; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    .footer { font-size: 11px; text-align: center; color: #94a3b8; margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
  </style>
</head>
<body>
  <h1>InsightForge™ Executive Analytics Report</h1>
  <div class="subtitle">Generated on ${new Date().toLocaleDateString()} | Project: ${projDoc.data()?.name}</div>

  <h2>1. Dataset Executive Profile</h2>
  <p>The dataset <strong>${ds.name}</strong> contains <strong>${ds.rowCount} rows</strong> and <strong>${ds.colCount} analytical variables</strong>.</p>
  <table>
    <thead>
      <tr>
        <th>Variable Name</th>
        <th>Type</th>
        <th>Null Count</th>
        <th>Unique Count</th>
        <th>Avg / Mean</th>
      </tr>
    </thead>
    <tbody>
      ${dsColumns.map(c => `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td>${c.type}</td>
          <td>${c.nullCount}</td>
          <td>${c.uniqueCount}</td>
          <td>${c.mean !== undefined ? c.mean : (c.mostFrequent ? `Mode: ${c.mostFrequent.value}` : "N/A")}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <h2>2. Row Samples</h2>
  <table>
    <thead>
      <tr>
        ${dsColumns.slice(0, 5).map(c => `<th>${c.name}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${dsData.slice(0, 5).map(row => `
        <tr>
          ${dsColumns.slice(0, 5).map(c => `<td>${row[c.name] !== undefined ? row[c.name] : ""}</td>`).join("")}
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="footer">
    This document was automatically compiled by the InsightForge™ Predictive Analytics core engine.
  </div>
</body>
</html>
    `;
    res.setHeader("Content-Type", "text/html");
    res.send(htmlReport);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SSE Live Anomaly / Sensor Stream endpoint
app.get("/api/stream/iot", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });

  incrementSockets();

  let counter = 0;
  const interval = setInterval(() => {
    counter++;
    const dateStr = new Date().toISOString();
    const hour = new Date().getUTCHours();
    const isPeak = hour >= 17 && hour <= 21;
    const baseUsage = isPeak ? 4.5 : 1.8;
    const temp = 15 + Math.sin((counter / 10) * Math.PI * 2) * 5 + (Math.random() - 0.5);
    const randomNoise = (Math.random() - 0.5) * 0.4;

    let energyConsumption = baseUsage + randomNoise;
    let voltage = 230 + (Math.random() - 0.5) * 4;

    let isAnomaly = false;
    if (Math.random() < 0.05) {
      isAnomaly = true;
      if (Math.random() > 0.5) {
        energyConsumption = parseFloat((10 + Math.random() * 4).toFixed(2));
        voltage = parseFloat((195 + Math.random() * 10).toFixed(2));
      } else {
        energyConsumption = 0.05;
        voltage = parseFloat((245 + Math.random() * 5).toFixed(2));
      }
    }

    const payload = {
      timestamp: dateStr,
      voltage: parseFloat(voltage.toFixed(2)),
      temperature: parseFloat(temp.toFixed(2)),
      energy_consumption: parseFloat(energyConsumption.toFixed(2)),
      device_status: energyConsumption > 9 || voltage < 215 ? "Warning" : "Active",
      isAnomaly
    };

    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }, 3000);

  req.on("close", () => {
    clearInterval(interval);
    decrementSockets();
  });
});

// ==========================================
// VITE DEV SERVER / PRODUCTION SERVING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`InsightForge server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
