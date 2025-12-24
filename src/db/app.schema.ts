import {
  mysqlTable,
  serial,
  text,
  varchar,
  timestamp,
  mysqlEnum,
  bigint,
  date,
  unique,
} from "drizzle-orm/mysql-core";

// Enum สำหรับ Role
export const userRoleEnum = ["ADMIN", "USER"] as const;

// Enum สำหรับ Output Type
export const outputTypeEnum = ["file", "hosxp_report", "dashboard", "other"] as const;

// Enum สำหรับ File Format
export const fileFormatEnum = ["excel", "pdf", "csv", "word"] as const;

// Enum สำหรับ Date Range Type
export const dateRangeTypeEnum = ["specific", "fiscal_year", "custom"] as const;

// Enum สำหรับ Priority
export const priorityEnum = ["low", "medium", "high", "urgent"] as const;

// Enum สำหรับ Source System
export const sourceSystemEnum = ["hosxp", "hosoffice", "php", "other"] as const;

// Local users - sync จาก external auth, เก็บ role ใน app
export const localUsers = mysqlTable("local_users", {
  id: serial("id").primaryKey(),
  externalUsername: varchar("external_username", { length: 100 })
    .notNull()
    .unique(),
  name: varchar("name", { length: 256 }),
  department: varchar("department", { length: 256 }),
  passwordHash: varchar("password_hash", { length: 256 }), // สำหรับ local auth (optional)
  role: mysqlEnum("role", userRoleEnum).default("USER").notNull(),
  // Telegram notification settings (user's own bot)
  telegramBotToken: varchar("telegram_bot_token", { length: 256 }),
  telegramChatId: varchar("telegram_chat_id", { length: 100 }),
  telegramNotificationsEnabled: mysqlEnum("telegram_notifications_enabled", ["true", "false"]).default("true"),
  // Email notification settings
  email: varchar("email", { length: 256 }),
  emailNotificationsEnabled: mysqlEnum("email_notifications_enabled", ["true", "false"]).default("false"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Reports table
export const reports = mysqlTable("reports", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  createdBy: bigint("created_by", { mode: "number", unsigned: true })
    .notNull()
    .references(() => localUsers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Report Requests table
export const reportRequests = mysqlTable("report_requests", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  
  // Output Type
  outputType: mysqlEnum("output_type", outputTypeEnum).default("file").notNull(),
  fileFormat: mysqlEnum("file_format", fileFormatEnum), // nullable, only for file type
  
  // Date Range
  dateRangeType: mysqlEnum("date_range_type", dateRangeTypeEnum).default("specific").notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  fiscalYearStart: varchar("fiscal_year_start", { length: 4 }), // e.g., "2567"
  fiscalYearEnd: varchar("fiscal_year_end", { length: 4 }), // e.g., "2568"
  
  // Priority & Deadline
  priority: mysqlEnum("priority", priorityEnum).default("medium").notNull(),
  expectedDeadline: date("expected_deadline"),
  
  // Source System
  sourceSystem: mysqlEnum("source_system", sourceSystemEnum).default("hosxp").notNull(),
  
  // Additional Info
  dataSource: varchar("data_source", { length: 256 }), // e.g., "ตาราง ovst, opdscreen"
  additionalNotes: text("additional_notes"),
  
  // Relations
  requestedBy: bigint("requested_by", { mode: "number", unsigned: true })
    .notNull()
    .references(() => localUsers.id),
  status: mysqlEnum("status", [
    "pending",
    "in_progress",
    "completed",
    "rejected",
    "cancelled",
  ])
    .default("pending")
    .notNull(),
  rejectionReason: text("rejection_reason"), // เหตุผลที่ปฏิเสธ
  
  // Assignment
  assignedTo: bigint("assigned_to", { mode: "number", unsigned: true })
    .references(() => localUsers.id),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Comments table
export const comments = mysqlTable("comments", {
  id: serial("id").primaryKey(),
  requestId: bigint("request_id", { mode: "number", unsigned: true })
    .notNull()
    .references(() => reportRequests.id),
  authorId: bigint("author_id", { mode: "number", unsigned: true })
    .notNull()
    .references(() => localUsers.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Request Views table (for unread comments tracking)
export const requestViews = mysqlTable(
  "request_views",
  {
    id: serial("id").primaryKey(),
    requestId: bigint("request_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => reportRequests.id),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => localUsers.id),
    viewedAt: timestamp("viewed_at").defaultNow().notNull(),
  },
  (t) => ({
    unq: unique().on(t.requestId, t.userId),
  })
);

// Attachment type enum
export const attachmentTypeEnum = ["reference", "result"] as const;

// Attachments table (for file uploads)
export const attachments = mysqlTable("attachments", {
  id: serial("id").primaryKey(),
  requestId: bigint("request_id", { mode: "number", unsigned: true })
    .notNull()
    .references(() => reportRequests.id),
  commentId: bigint("comment_id", { mode: "number", unsigned: true })
    .references(() => comments.id), // NULL if attached to request directly
  uploaderId: bigint("uploader_id", { mode: "number", unsigned: true })
    .notNull()
    .references(() => localUsers.id),
  // Type of attachment: reference (from user) or result (from admin)
  attachmentType: mysqlEnum("attachment_type", attachmentTypeEnum).default("reference").notNull(),
  filename: varchar("filename", { length: 256 }).notNull(), // Original filename
  storedFilename: varchar("stored_filename", { length: 256 }).notNull(), // UUID-based stored filename
  fileType: varchar("file_type", { length: 100 }).notNull(), // MIME type
  fileSize: bigint("file_size", { mode: "number", unsigned: true }).notNull(), // Size in bytes
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notification type enum
export const notificationTypeEnum = ["status_change", "new_comment", "new_request"] as const;

// Notification log table
export const notificationLog = mysqlTable("notification_log", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true })
    .notNull()
    .references(() => localUsers.id),
  requestId: bigint("request_id", { mode: "number", unsigned: true })
    .notNull()
    .references(() => reportRequests.id),
  notificationType: mysqlEnum("notification_type", notificationTypeEnum).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending").notNull(),
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audit Logs table
export const auditLogs = mysqlTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true })
    .references(() => localUsers.id), // Nullable for system actions
  action: varchar("action", { length: 50 }).notNull(), // e.g., "LOGIN", "CREATE_REQUEST", "DELETE_FILE"
  resourceType: varchar("resource_type", { length: 50 }).notNull(), // e.g., "REQUEST", "ATTACHMENT"
  resourceId: varchar("resource_id", { length: 256 }), // ID as string to be flexible
  details: text("details"), // JSON string or text description
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
