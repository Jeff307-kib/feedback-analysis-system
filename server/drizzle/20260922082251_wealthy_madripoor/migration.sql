CREATE TYPE "dataset_status" AS ENUM('PENDING', 'ANALYSIS_IN_PROGRESS', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "role" AS ENUM('ADMIN', 'RETAIL_MANAGER');--> statement-breakpoint
CREATE TYPE "subscription_status" AS ENUM('ACTIVE', 'EXPIRED');--> statement-breakpoint
CREATE TABLE "active_subscriptions" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp NOT NULL,
	"used_storage_mb" numeric(10,2) DEFAULT '0' NOT NULL,
	"status" "subscription_status" DEFAULT 'ACTIVE'::"subscription_status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "datasets" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"filename" varchar(255) NOT NULL,
	"file_path" varchar(255) NOT NULL,
	"file_size_mb" numeric(10,2) NOT NULL,
	"status" "dataset_status" DEFAULT 'PENDING'::"dataset_status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_results" (
	"id" serial PRIMARY KEY,
	"review_id" integer NOT NULL,
	"aspect" varchar(255) NOT NULL,
	"sentiment" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" serial PRIMARY KEY,
	"name" varchar(100) NOT NULL,
	"price" numeric(10,2) NOT NULL,
	"max_storage_mb" integer NOT NULL,
	"duration_days" integer DEFAULT 30 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY,
	"dataset_id" integer NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"review_text" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" serial PRIMARY KEY,
	"username" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL UNIQUE,
	"password" varchar(255) NOT NULL,
	"company_name" varchar(255),
	"company_email" varchar(255),
	"role" "role" DEFAULT 'RETAIL_MANAGER'::"role" NOT NULL,
	"has_used_free_trial" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "active_subscriptions" ADD CONSTRAINT "active_subscriptions_user_id_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id");--> statement-breakpoint
ALTER TABLE "active_subscriptions" ADD CONSTRAINT "active_subscriptions_plan_id_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id");--> statement-breakpoint
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_user_id_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id");--> statement-breakpoint
ALTER TABLE "feedback_results" ADD CONSTRAINT "feedback_results_review_id_reviews_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id");--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_dataset_id_datasets_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id");