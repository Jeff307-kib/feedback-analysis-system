import { pgTable, serial, varchar, timestamp, boolean, pgEnum, integer, numeric } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['ADMIN', 'RETAIL_MANAGER']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['ACTIVE', 'EXPIRED']);

export const users = pgTable('users', {
  id: serial('user_id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password', { length: 255 }).notNull(),
  companyName: varchar('company_name', { length: 255 }),
  companyEmail: varchar('company_email', { length: 255 }),
  role: roleEnum('role').default('RETAIL_MANAGER').notNull(),
  hasUsedFreeTrial: boolean('has_used_free_trial').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const plans = pgTable('plans', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  maxStorageMb: integer('max_storage_mb').notNull(),
  durationDays: integer('duration_days').default(30).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const activeSubscriptions = pgTable('active_subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  planId: integer('plan_id').references(() => plans.id).notNull(),
  startDate: timestamp('start_date').defaultNow().notNull(),
  endDate: timestamp('end_date').notNull(),
  usedStorageMb: numeric('used_storage_mb', { precision: 10, scale: 2 }).default('0').notNull(),
  status: subscriptionStatusEnum('status').default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const datasetStatusEnum = pgEnum('dataset_status', ['PENDING', 'ANALYSIS_IN_PROGRESS', 'COMPLETED', 'FAILED']);

export const datasets = pgTable('datasets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 255 }).notNull(),
  fileSizeMb: numeric('file_size_mb', { precision: 10, scale: 2 }).notNull(),
  status: datasetStatusEnum('status').default('PENDING').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  datasetId: integer('dataset_id').references(() => datasets.id).notNull(),
  productName: varchar('product_name', { length: 255 }).notNull(),
  reviewText: varchar('review_text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const feedbackResults = pgTable('feedback_results', {
  id: serial('id').primaryKey(),
  reviewId: integer('review_id').references(() => reviews.id).notNull(),
  aspect: varchar('aspect', { length: 255 }).notNull(),
  opinion: varchar('opinion').notNull(),
  sentiment: varchar('sentiment', { length: 50 }).notNull(), // e.g., 'Positive', 'Negative', 'Neutral'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
