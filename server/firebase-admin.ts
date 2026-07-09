import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { createPool } from "../src/db/index.ts";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize secondary app for token verification (using client's project ID)
const authApp = getApps().find(a => a.name === "userAuthApp") || initializeApp({
  projectId: firebaseConfig.projectId
}, "userAuthApp");

export const adminAuth = getAuth(authApp);

// Postgres/Drizzle emulator of the Firestore API to bypass Cloud Run credential permission restrictions
const pool = createPool();

// Suppress pool-level uncaught errors
pool.on("error", (err) => {
  console.error("Postgres adapter pool error:", err);
});

function getDbTableName(collectionName: string): string {
  if (collectionName === "activity") return "activity_logs";
  return collectionName;
}

function getDbColumnName(collectionName: string, propName: string): string {
  if (collectionName === "users" && propName === "uid") return "id";
  return propName.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function fromPostgresRow(collectionName: string, row: any): any {
  const data = { ...row };
  if (collectionName === "users") {
    data.id = row.uid;
    data.displayName = row.name;
    data.photoURL = null;
    data.isEmailVerified = true;
    data.lastLogin = row.updatedAt;
  }
  return data;
}

function toPostgresRow(collectionName: string, data: any, docId: string): any {
  const row: any = {};
  if (collectionName === "users") {
    row.uid = docId;
    if (data.email !== undefined) row.email = data.email;
    if (data.name !== undefined) row.name = data.name;
    else if (data.displayName !== undefined) row.name = data.displayName;
    if (data.passwordHash !== undefined) row.passwordHash = data.passwordHash;
    if (data.provider !== undefined) row.provider = data.provider;
    if (data.role !== undefined) row.role = data.role;
    if (data.company !== undefined) row.company = data.company;
    if (data.designation !== undefined) row.designation = data.designation;
    if (data.country !== undefined) row.country = data.country;
    if (data.theme !== undefined) row.theme = data.theme;
    if (data.language !== undefined) row.language = data.language;
    if (data.createdAt !== undefined) row.createdAt = data.createdAt;
    if (data.updatedAt !== undefined) row.updatedAt = data.updatedAt;
  } else if (collectionName === "projects") {
    row.id = docId;
    if (data.name !== undefined) row.name = data.name;
    if (data.description !== undefined) row.description = data.description;
    if (data.userId !== undefined) row.userId = data.userId;
    if (data.selectedDatasetId !== undefined) row.selectedDatasetId = data.selectedDatasetId;
    if (data.createdAt !== undefined) row.createdAt = data.createdAt;
  } else if (collectionName === "datasets") {
    row.id = docId;
    if (data.projectId !== undefined) row.projectId = data.projectId;
    if (data.name !== undefined) row.name = data.name;
    if (data.rowCount !== undefined) row.rowCount = data.rowCount;
    if (data.colCount !== undefined) row.colCount = data.colCount;
    if (data.columns !== undefined) row.columns = JSON.stringify(data.columns);
    if (data.data !== undefined) row.data = JSON.stringify(data.data);
    if (data.cleanData !== undefined) row.cleanData = JSON.stringify(data.cleanData);
    if (data.cleanLogs !== undefined) row.cleanLogs = JSON.stringify(data.cleanLogs);
    if (data.createdAt !== undefined) row.createdAt = data.createdAt;
  } else if (collectionName === "models") {
    row.id = docId;
    if (data.projectId !== undefined) row.projectId = data.projectId;
    if (data.datasetId !== undefined) row.datasetId = data.datasetId;
    if (data.name !== undefined) row.name = data.name;
    if (data.targetColumn !== undefined) row.targetColumn = data.targetColumn;
    if (data.modelType !== undefined) row.modelType = data.modelType;
    if (data.status !== undefined) row.status = data.status;
    if (data.metrics !== undefined) row.metrics = JSON.stringify(data.metrics);
    if (data.createdAt !== undefined) row.createdAt = data.createdAt;
  } else if (collectionName === "reports") {
    row.id = docId;
    if (data.projectId !== undefined) row.projectId = data.projectId;
    if (data.name !== undefined) row.name = data.name;
    if (data.summary !== undefined) row.summary = data.summary;
    if (data.insights !== undefined) row.insights = JSON.stringify(data.insights);
    if (data.createdAt !== undefined) row.createdAt = data.createdAt;
  } else if (collectionName === "activity") {
    row.id = docId;
    if (data.userId !== undefined) row.userId = data.userId;
    if (data.action !== undefined) row.action = data.action;
    if (data.details !== undefined) row.details = data.details;
    if (data.timestamp !== undefined) row.timestamp = data.timestamp;
  } else if (collectionName === "notifications") {
    row.id = docId;
    if (data.userId !== undefined) row.userId = data.userId;
    if (data.title !== undefined) row.title = data.title;
    if (data.message !== undefined) row.message = data.message;
    if (data.read !== undefined) row.read = data.read;
    if (data.createdAt !== undefined) row.createdAt = data.createdAt;
  } else if (collectionName === "demo_requests") {
    row.id = docId;
    if (data.name !== undefined) row.name = data.name;
    if (data.email !== undefined) row.email = data.email;
    if (data.company !== undefined) row.company = data.company;
    if (data.message !== undefined) row.message = data.message;
    if (data.createdAt !== undefined) row.createdAt = data.createdAt;
    if (data.status !== undefined) row.status = data.status;
  }
  return row;
}

async function upsertRow(collectionName: string, row: any, id: string) {
  const columns = Object.keys(row);
  if (columns.length === 0) return;
  const values = Object.values(row);
  const pkColumn = collectionName === "users" ? "id" : "id";
  
  const colString = columns.map(col => `"${getDbColumnName(collectionName, col)}"`).join(", ");
  const valString = columns.map((_, idx) => `$${idx + 1}`).join(", ");
  const setString = columns
    .map((col, idx) => `"${getDbColumnName(collectionName, col)}" = $${idx + 1}`)
    .join(", ");

  const query = `
    INSERT INTO "${getDbTableName(collectionName)}" (${colString})
    VALUES (${valString})
    ON CONFLICT ("${pkColumn}")
    DO UPDATE SET ${setString}
  `;
  await pool.query(query, values);
}

async function updateRow(collectionName: string, row: any, id: string) {
  const columns = Object.keys(row);
  if (columns.length === 0) return;
  const values = Object.values(row);
  const pkColumn = collectionName === "users" ? "id" : "id";
  
  const setString = columns
    .map((col, idx) => `"${getDbColumnName(collectionName, col)}" = $${idx + 1}`)
    .join(", ");

  const query = `
    UPDATE "${getDbTableName(collectionName)}"
    SET ${setString}
    WHERE "${pkColumn}" = $${columns.length + 1}
  `;
  await pool.query(query, [...values, id]);
}

class PostgresDocAdapter {
  constructor(private collectionName: string, private docId: string) {}

  async get() {
    const tableName = getDbTableName(this.collectionName);
    const pkColumn = this.collectionName === "users" ? "id" : "id";
    const res = await pool.query(`SELECT * FROM "${tableName}" WHERE "${pkColumn}" = $1`, [this.docId]);
    
    const exists = res.rows.length > 0;
    const row = exists ? res.rows[0] : null;

    let docData: any = null;
    if (row) {
      const camelRow: any = {};
      for (const key of Object.keys(row)) {
        let propName = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
        if (this.collectionName === "users" && key === "id") {
          propName = "uid";
        }
        camelRow[propName] = row[key];
      }
      docData = fromPostgresRow(this.collectionName, camelRow);
    }

    return {
      exists,
      id: this.docId,
      data: () => docData,
    };
  }

  async set(data: any) {
    const row = toPostgresRow(this.collectionName, data, this.docId);
    await upsertRow(this.collectionName, row, this.docId);
  }

  async update(data: any) {
    const row = toPostgresRow(this.collectionName, data, this.docId);
    await updateRow(this.collectionName, row, this.docId);
  }

  async delete() {
    const tableName = getDbTableName(this.collectionName);
    const pkColumn = this.collectionName === "users" ? "id" : "id";
    await pool.query(`DELETE FROM "${tableName}" WHERE "${pkColumn}" = $1`, [this.docId]);
  }
}

class PostgresQueryAdapter {
  private conditions: string[] = [];
  private bindings: any[] = [];
  private orderField: string | null = null;
  private orderDirection: "asc" | "desc" = "asc";
  private limitCount: number | null = null;

  constructor(private collectionName: string) {}

  where(field: string, op: string, value: any) {
    if (op !== "==") {
      throw new Error(`Unsupported operator ${op}`);
    }
    const dbCol = getDbColumnName(this.collectionName, field);
    const paramIdx = this.conditions.length + 1;
    this.conditions.push(`"${dbCol}" = $${paramIdx}`);
    this.bindings.push(value);
    return this;
  }

  orderBy(field: string, direction: "asc" | "desc" = "asc") {
    this.orderField = getDbColumnName(this.collectionName, field);
    this.orderDirection = direction;
    return this;
  }

  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  async get() {
    const tableName = getDbTableName(this.collectionName);
    let query = `SELECT * FROM "${tableName}"`;
    if (this.conditions.length > 0) {
      query += ` WHERE ${this.conditions.join(" AND ")}`;
    }
    if (this.orderField) {
      query += ` ORDER BY "${this.orderField}" ${this.orderDirection.toUpperCase()}`;
    }
    if (this.limitCount !== null) {
      query += ` LIMIT ${this.limitCount}`;
    }

    const res = await pool.query(query, this.bindings);
    const docs = res.rows.map((row: any) => {
      const camelRow: any = {};
      for (const key of Object.keys(row)) {
        let propName = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
        if (this.collectionName === "users" && key === "id") {
          propName = "uid";
        }
        camelRow[propName] = row[key];
      }

      const docData = fromPostgresRow(this.collectionName, camelRow);
      const docId = this.collectionName === "users" ? camelRow.uid : camelRow.id;

      return {
        id: docId,
        data: () => docData,
      };
    });

    return {
      empty: docs.length === 0,
      size: docs.length,
      docs,
    };
  }
}

class PostgresCollectionAdapter {
  constructor(private collectionName: string) {}

  doc(id: string) {
    return new PostgresDocAdapter(this.collectionName, id);
  }

  where(field: string, op: string, value: any) {
    return new PostgresQueryAdapter(this.collectionName).where(field, op, value);
  }

  orderBy(field: string, direction: "asc" | "desc" = "asc") {
    return new PostgresQueryAdapter(this.collectionName).orderBy(field, direction);
  }

  limit(n: number) {
    return new PostgresQueryAdapter(this.collectionName).limit(n);
  }

  async get() {
    return new PostgresQueryAdapter(this.collectionName).get();
  }
}

export const adminDb = {
  collection(collectionName: string) {
    return new PostgresCollectionAdapter(collectionName);
  }
} as any;
