import {
  integer,
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  serial,
  foreignKey,
  unique,
  pgEnum,
  decimal,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const difficultyEnum = pgEnum("difficulty", [
  "easy",
  "medium",
  "hard",
]);

export const submissionStatusEnum = pgEnum("submission_status", [
  "accepted",
  "wrong_answer",
  "runtime_error",
  "time_limit_exceeded",
  "compilation_error",
  "pending",
]);

export const matchStatusEnum = pgEnum("match_status", [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
]);

export const languageEnum = pgEnum("language", [
  "javascript",
  "python",
  "java",
  "cpp",
  "csharp",
  "go",
  "rust",
  "typescript",
]);

// USERS TABLE (BetterAuth compatible)
export const usersTable = pgTable("user", {
  id: varchar({ length: 255 }).primaryKey(),
  name: varchar({ length: 255 }),
  email: varchar({ length: 255 }).notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: varchar({ length: 500 }),
  username: varchar({ length: 100 }).unique(),
  bio: text(),
  // Custom fields for CodeConquer
  rating: decimal({ precision: 10, scale: 2 }).notNull().default("1200"),
  total_matches: integer().notNull().default(0),
  wins: integer().notNull().default(0),
  losses: integer().notNull().default(0),
  win_streak: integer().notNull().default(0),
  created_at: timestamp().notNull().defaultNow(),
  updated_at: timestamp().notNull().defaultNow(),
});

// SESSIONS TABLE (BetterAuth)
export const sessionTable = pgTable("session", {
  id: varchar({ length: 255 }).primaryKey(),
  expiresAt: timestamp().notNull(),
  token: varchar({ length: 255 }).notNull().unique(),
  createdAt: timestamp().notNull(),
  updatedAt: timestamp().notNull(),
  ipAddress: varchar({ length: 45 }),
  userAgent: text(),
  userId: varchar({ length: 255 })
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
});

// ACCOUNTS TABLE (BetterAuth - for OAuth)
export const accountTable = pgTable("account", {
  id: varchar({ length: 255 }).primaryKey(),
  accountId: varchar({ length: 255 }).notNull(),
  provider: varchar({ length: 255 }).notNull(),
  providerAccountId: varchar({ length: 255 }).notNull(),
  refreshToken: text(),
  accessToken: text(),
  expiresAt: timestamp(),
  password: varchar({ length: 255 }),
  userId: varchar({ length: 255 })
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
});

// VERIFICATION TABLE (BetterAuth - for email verification)
export const verificationTable = pgTable("verification", {
  id: varchar({ length: 255 }).primaryKey(),
  identifier: varchar({ length: 255 }).notNull(),
  value: varchar({ length: 255 }).notNull(),
  expiresAt: timestamp().notNull(),
  createdAt: timestamp(),
  updatedAt: timestamp(),
});

// PROBLEMS TABLE
export const problemsTable = pgTable(
  "problems",
  {
    id: serial().primaryKey(),
    title: varchar({ length: 255 }).notNull(),
    description: text().notNull(),
    difficulty: difficultyEnum().notNull(),
    constraints: text().notNull(),
    input_format: text().notNull(),
    output_format: text().notNull(),
    examples: text().notNull(), // JSON string with example inputs/outputs
    test_cases: text().notNull(), // JSON string with all test cases
    solution_code: text(), // Optional reference solution
    time_limit_ms: integer().notNull().default(1000),
    memory_limit_mb: integer().notNull().default(256),
    acceptance_rate: decimal({ precision: 5, scale: 2 }).notNull().default("0"),
    times_solved: integer().notNull().default(0),
    created_by: varchar({ length: 255 }).notNull(),
    created_at: timestamp().notNull().defaultNow(),
    updated_at: timestamp().notNull().defaultNow(),
    visible: boolean().notNull().default(true),
  },
  (table) => ({
    createdByRef: foreignKey({
      columns: [table.created_by],
      foreignColumns: [usersTable.id],
    }),
  })
);

// MATCHES TABLE
export const matchesTable = pgTable(
  "matches",
  {
    id: serial().primaryKey(),
    player1_id: varchar({ length: 255 }).notNull(),
    player2_id: varchar({ length: 255 }).notNull(),
    problem_id: integer().notNull(),
    status: matchStatusEnum().notNull().default("pending"),
    player1_rating_before: decimal({ precision: 10, scale: 2 }).notNull(),
    player2_rating_before: decimal({ precision: 10, scale: 2 }).notNull(),
    player1_rating_after: decimal({ precision: 10, scale: 2 }),
    player2_rating_after: decimal({ precision: 10, scale: 2 }),
    winner_id: varchar({ length: 255 }), // null if draw/cancelled
    player1_solved: boolean().notNull().default(false),
    player2_solved: boolean().notNull().default(false),
    player1_solve_time_ms: integer(), // Time taken in milliseconds
    player2_solve_time_ms: integer(),
    player1_attempts: integer().notNull().default(0),
    player2_attempts: integer().notNull().default(0),
    start_time: timestamp(),
    end_time: timestamp(),
    created_at: timestamp().notNull().defaultNow(),
    updated_at: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    player1Ref: foreignKey({
      columns: [table.player1_id],
      foreignColumns: [usersTable.id],
    }),
    player2Ref: foreignKey({
      columns: [table.player2_id],
      foreignColumns: [usersTable.id],
    }),
    problemRef: foreignKey({
      columns: [table.problem_id],
      foreignColumns: [problemsTable.id],
    }),
    winnerRef: foreignKey({
      columns: [table.winner_id],
      foreignColumns: [usersTable.id],
    }),
  })
);

// SUBMISSIONS TABLE
export const submissionsTable = pgTable(
  "submissions",
  {
    id: serial().primaryKey(),
    user_id: varchar({ length: 255 }).notNull(),
    match_id: integer().notNull(),
    problem_id: integer().notNull(),
    code: text().notNull(),
    language: languageEnum().notNull(),
    status: submissionStatusEnum().notNull().default("pending"),
    error_message: text(),
    execution_time_ms: integer(),
    memory_used_mb: integer(),
    test_cases_passed: integer(),
    test_cases_total: integer(),
    submitted_at: timestamp().notNull().defaultNow(),
    created_at: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    userRef: foreignKey({
      columns: [table.user_id],
      foreignColumns: [usersTable.id],
    }),
    matchRef: foreignKey({
      columns: [table.match_id],
      foreignColumns: [matchesTable.id],
    }),
    problemRef: foreignKey({
      columns: [table.problem_id],
      foreignColumns: [problemsTable.id],
    }),
  })
);

// RATING HISTORY TABLE
export const ratingHistoryTable = pgTable(
  "rating_history",
  {
    id: serial().primaryKey(),
    user_id: varchar({ length: 255 }).notNull(),
    match_id: integer().notNull(),
    rating_before: decimal({ precision: 10, scale: 2 }).notNull(),
    rating_after: decimal({ precision: 10, scale: 2 }).notNull(),
    rating_change: decimal({ precision: 10, scale: 2 }).notNull(),
    created_at: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    userRef: foreignKey({
      columns: [table.user_id],
      foreignColumns: [usersTable.id],
    }),
    matchRef: foreignKey({
      columns: [table.match_id],
      foreignColumns: [matchesTable.id],
    }),
  })
);

// MATCHMAKING QUEUE TABLE
export const matchmakingQueueTable = pgTable(
  "matchmaking_queue",
  {
    id: serial().primaryKey(),
    user_id: varchar({ length: 255 }).notNull().unique(),
    current_rating: decimal({ precision: 10, scale: 2 }).notNull(),
    difficulty_preference: difficultyEnum().notNull().default("medium"),
    queued_at: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    userRef: foreignKey({
      columns: [table.user_id],
      foreignColumns: [usersTable.id],
    }),
  })
);

// LEADERBOARD VIEW TABLE (denormalized for performance)
export const leaderboardTable = pgTable(
  "leaderboard",
  {
    id: serial().primaryKey(),
    user_id: varchar({ length: 255 }).notNull().unique(),
    username: varchar({ length: 100 }).notNull(),
    rating: decimal({ precision: 10, scale: 2 }).notNull(),
    wins: integer().notNull(),
    losses: integer().notNull(),
    total_matches: integer().notNull(),
    win_streak: integer().notNull(),
    rank: integer().notNull(),
    updated_at: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    userRef: foreignKey({
      columns: [table.user_id],
      foreignColumns: [usersTable.id],
    }),
  })
);

// RELATIONS
export const usersRelations = relations(usersTable, ({ many }) => ({
  matches_as_player1: many(matchesTable, {
    relationName: "player1",
  }),
  matches_as_player2: many(matchesTable, {
    relationName: "player2",
  }),
  submissions: many(submissionsTable),
  rating_history: many(ratingHistoryTable),
}));

export const problemsRelations = relations(problemsTable, ({ many }) => ({
  matches: many(matchesTable),
  submissions: many(submissionsTable),
}));

export const matchesRelations = relations(
  matchesTable,
  ({ one, many }) => ({
    player1: one(usersTable, {
      fields: [matchesTable.player1_id],
      references: [usersTable.id],
      relationName: "player1",
    }),
    player2: one(usersTable, {
      fields: [matchesTable.player2_id],
      references: [usersTable.id],
      relationName: "player2",
    }),
    problem: one(problemsTable, {
      fields: [matchesTable.problem_id],
      references: [problemsTable.id],
    }),
    winner: one(usersTable, {
      fields: [matchesTable.winner_id],
      references: [usersTable.id],
    }),
    submissions: many(submissionsTable),
    rating_changes: many(ratingHistoryTable),
  })
);

export const submissionsRelations = relations(
  submissionsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [submissionsTable.user_id],
      references: [usersTable.id],
    }),
    match: one(matchesTable, {
      fields: [submissionsTable.match_id],
      references: [matchesTable.id],
    }),
    problem: one(problemsTable, {
      fields: [submissionsTable.problem_id],
      references: [problemsTable.id],
    }),
  })
);

export const ratingHistoryRelations = relations(
  ratingHistoryTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [ratingHistoryTable.user_id],
      references: [usersTable.id],
    }),
    match: one(matchesTable, {
      fields: [ratingHistoryTable.match_id],
      references: [matchesTable.id],
    }),
  })
); 
 