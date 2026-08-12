import {
  pgTable,
  serial,
  text,
  real,
  timestamp,
  boolean,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

// Fund watchlist configuration
export const funds = pgTable("funds", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  amfiCode: text("amfi_code"),
  proxyIndex: text("proxy_index").notNull(),
  category: text("category"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Daily NAV history for each fund
export const navHistory = pgTable("nav_history", {
  id: serial("id").primaryKey(),
  fundId: integer("fund_id")
    .notNull()
    .references(() => funds.id),
  navDate: text("nav_date").notNull(), // YYYY-MM-DD
  nav: real("nav").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Index history snapshots
export const indexHistory = pgTable("index_history", {
  id: serial("id").primaryKey(),
  indexName: text("index_name").notNull(),
  snapshotDate: text("snapshot_date").notNull(), // YYYY-MM-DD
  closeValue: real("close_value"),
  changePercent: real("change_percent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Dashboard cache — stores the last fully computed payload
export const dashboardCache = pgTable("dashboard_cache", {
  id: serial("id").primaryKey(),
  payload: jsonb("payload").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// App settings
export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
