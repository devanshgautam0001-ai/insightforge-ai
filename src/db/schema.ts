import { pgTable, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Users Table (using Firebase Auth uid as the primary key mapped to "id")
export const users = pgTable("users", {
  uid: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  passwordHash: text("password_hash"),
  provider: text("provider"),
  role: text("role").notNull().default("ANALYST"), // SUPER_ADMIN, ADMIN, ANALYST, VIEWER
  company: text("company"),
  designation: text("designation"),
  country: text("country"),
  theme: text("theme").notNull().default("dark"), // dark, light
  language: text("language").notNull().default("en"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 2. Projects Table
export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userId: text("user_id")
    .references(() => users.uid, { onDelete: "cascade" })
    .notNull(),
  selectedDatasetId: text("selected_dataset_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 3. Datasets Table
export const datasets = pgTable("datasets", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  rowCount: integer("row_count").notNull(),
  colCount: integer("col_count").notNull(),
  columns: jsonb("columns").notNull(), // Column profiles array
  data: jsonb("data").notNull(), // Raw row records array
  cleanData: jsonb("clean_data").notNull(), // Cleaned row records array
  cleanLogs: jsonb("clean_logs").notNull(), // Array of operation logs
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4. Models Table
export const models = pgTable("models", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  datasetId: text("dataset_id")
    .references(() => datasets.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  targetColumn: text("target_column"),
  modelType: text("model_type"), // Classification, Regression, Time-Series
  status: text("status").notNull(), // Training, Complete, Failed
  metrics: jsonb("metrics"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 5. Reports Table
export const reports = pgTable("reports", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  summary: text("summary"),
  insights: jsonb("insights"), // Array of generated insights
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 6. Activity Logs Table
export const activityLogs = pgTable("activity_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .references(() => users.uid, { onDelete: "cascade" })
    .notNull(),
  action: text("action").notNull(), // Login, Upload Dataset, etc.
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// 7. Notifications Table
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .references(() => users.uid, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  activityLogs: many(activityLogs),
  notifications: many(notifications),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.uid],
  }),
  datasets: many(datasets),
  models: many(models),
  reports: many(reports),
}));

export const datasetsRelations = relations(datasets, ({ one, many }) => ({
  project: one(projects, {
    fields: [datasets.projectId],
    references: [projects.id],
  }),
  models: many(models),
}));

export const modelsRelations = relations(models, ({ one }) => ({
  project: one(projects, {
    fields: [models.projectId],
    references: [projects.id],
  }),
  dataset: one(datasets, {
    fields: [models.datasetId],
    references: [datasets.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  project: one(projects, {
    fields: [reports.projectId],
    references: [projects.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.uid],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.uid],
  }),
}));

// 8. Demo Requests Table
export const demoRequests = pgTable("demo_requests", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  status: text("status").default("Pending").notNull(),
});
