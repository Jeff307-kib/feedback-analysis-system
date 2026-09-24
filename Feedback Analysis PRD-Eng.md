The project will involve two actors: Super Admin and Retail Manager. 

**Retail Manager** 
- Can register and login. 
- Will receive a dashboard upon successful login. 
- Can upload a CSV file to their dashboard to perform Sentiment Analysis. 
- However, an active subscription is required, which must be verified first. If it is the first time uploading a CSV, it will be provided for free with a maximum file size limit of 75MB. 
- After the first-time use, the system will check for an active subscription and remaining quota for subsequent uploads. If valid, it will proceed to validate the CSV file, ensuring it is strictly in `.csv` format. 
- Once the file is uploaded, analysis results related to that CSV file can be viewed. 
- The resulting analysis data can be exported as a file. 

**Admin**
- The Admin does not need to register. Their account credentials must be seeded directly into the Database. The Admin can login. 
- There will be a Management Dashboard for the Admin. 
- Can view an overview of how many users are utilizing the system. 
- Can view user accounts, the number of CSV files uploaded, and the Subscription Plan purchased.
- Can add new Subscription Plans. Must be able to edit and delete them.


# Electronic Sector, Aspect Base Sentiment Analysis System - Project Modules

Based on the project requirements, the entire system can be categorized into **5 core modules** as follows.

## 1. Authentication & Authorization Module

This module controls user accounts and roles.

- **For Retail Manager (User):**
    - **Registration:** Must be able to open a new account (Name, Email, Password, etc.).
    - **Login / Logout:** Must be able to log in and out.
    - **Role Routing:** Must automatically route to the Retail Manager Dashboard upon login.
        
- **For Super Admin:**
    - **Seeded Account:** Does not require registration; must log in using pre-configured credentials (Email, Password) seeded in the database.
    - **Role Routing:** Must automatically route to the Admin Management Dashboard upon login.

### 1. Database Schema & Role Design

- **Role Definition:** To avoid complexity, define roles strictly as two types: `ADMIN` and `RETAIL_MANAGER` (using Enum or String).
- **Essential User Fields:**
    - `id` (UUID or Auto-increment ID)
    - `name`
    - `email` (Must be unique and saved case-insensitively, e.g., converted to lowercase)
    - `password_hash` (Never store plain text passwords; store them hashed using bcrypt/argon2)
    - `role` (`ADMIN` | `RETAIL_MANAGER`)
    - `created_at`, `updated_at`
	- `had_used_free_trial`: Boolean, Default: False (The user gets one free analysis for a newly created account.)
        
### 2. Validation & Security Checks

- **Email Validation:** Validate for correct Email format and check for duplicates in the Database (Duplicate email handling).
- **Password Policy:** For the MVP, instead of overly complex Regex rules, define a minimum length (e.g., Minimum 8 characters).
- **Sanitization:** Trim whitespaces from input data.
- **Generic Error Messages:** To prevent User Enumeration attacks, display a generic "Invalid email or password" instead of specific errors like "Email does not exist" or "Incorrect password" upon login failure.
    
### 3. Session & Token Management

- **Token-based Auth (JWT):** If using the widely adopted JWT (JSON Web Token) for the MVP, include `userId` and `role` in the payload.
- **Token Expiry:** Set a token expiry (e.g., 1 day or 7 days). (For the MVP, you can start simply by requiring a re-login when the token expires without implementing Refresh Tokens yet).
- **Secure Storage:** Store the Token on the frontend via `HttpOnly Cookie` (most secure) or in `localStorage`.
    
### 4. Middleware & Route Protection

- **Auth Middleware:** Check for token presence and expiration on every API endpoint.
- **RBAC Guard (Role-based Access Control):**
    - For example, strictly allow access to `/api/admin/*` endpoints only if the Role is `ADMIN` (return `403 Forbidden` if a Manager attempts access).
    - Implement Protected Routes on the frontend and Redirect to `/login` if no token is present.
        
### 5. Admin Database Seeder

- A Migration or Database Seed script is required.
- It must read `ADMIN_EMAIL` and `ADMIN_DEFAULT_PASSWORD` from Environment Variables (`.env`) upon app startup, hash the password, and automatically seed it into the Database.
        

## 2. Subscription & Quota Management Module

This module checks and manages user access quotas and plans.

- **For Retail Manager (User):**
    - **First-Time Free Check:** Verify if the user is using the system for the first time; if yes, grant a Free Quota (e.g., 1 usage limit).
    - **Subscription Validation:** Check for an active purchased Plan for subsequent uses.
    - **Quota Tracking:** Even with an active plan, verify if there is remaining quota. Keep a record of the usage count.
        
- **For Super Admin (Plan Management):**
    - **Create Plan:** Can create new Subscription Plans (e.g., Basic, Pro, Enterprise) defining price, provided quota, etc.
    - **Edit Plan:** Can modify details of existing plans.
    - **Delete Plan:** Can delete or deactivate obsolete plans.
        
### 1. Database Schema Design

Two main tables are required for this module.

- **`plans` Table (Plans created by Admin):**
    - `id` (Primary Key)
    - `name` (e.g., Basic, Pro, Enterprise)
    - `price`
    - `max_storage_mb` (Total allowed file size - e.g., 300)
    - `duration_days` (Validity period - e.g., 30)
    - `is_active` (Boolean - True/False) - *Use this to determine active status instead of deleting the plan.*
        
- **`user_subscriptions` Table (User Purchase History):**
    - `id` (Primary Key)
    - `user_id` (Foreign Key -> users table)
    - `plan_id` (Foreign Key -> plans table)
    - `start_date` (Purchase date)
    - `end_date` (Expiration date)
    - `used_storage_mb` (Currently used total file size - Default: 0)
    - `status` (`ACTIVE`, `EXPIRED`)

### 2. First-Time Free Logic

When a user initially uploads a CSV file, the Backend must check as follows.

- **Check Condition:** Verify if the user's `has_used_free_trial` is `false`.
- **Validation:**
    - If `false`, check the file size. Reject the file with "Free trial limit is 75MB" if it exceeds `75MB`.
    - If under `75MB`, accept it for analysis. Once done, update `has_used_free_trial` to `true`.
- **Next Time:** On the next upload, since `has_used_free_trial` is `true`, it will route to the logic checking for an active Subscription.
    
### 3. Subscription & Quota Validation

Users who have exhausted their Free Trial must pass these checks on every upload.

- **Active Plan Check:** Verify if there is a Plan with an `ACTIVE` status for the specific user in the `user_subscriptions` table.
- **Expiry Check:** Verify if the current time (Current Date) has passed the `end_date`. If exceeded, display "Subscription expired. Please renew."
- **Storage Quota Check (Most Critical):**
    - Calculate the Size (MB) of the newly uploaded file.
    - Check if `used_storage_mb + new_file_size_mb <= plan's max_storage_mb`.
    - If not exceeded, accept the file and update (add) the `used_storage_mb`. If exceeded, display "Storage Quota Exceeded. Please upgrade your plan."
        
### 4. Upgrade / Renew Logic

When a user buys a new Plan due to reaching their quota or expiration:

- **Update Subscription:**
    - Replace `plan_id` with the ID of the newly purchased Plan.
    - Change `start_date` to Today.
    - Change `end_date` to 30 days from today (Today + 30 Days).
    - Revert `status` to `ACTIVE`.
    - Keep `used_storage_mb` at its current used amount **(do not reset to zero)**. (This ensures they correctly continue utilizing their remaining quota from the new Storage Limit).
        
### 5. Admin Plan Management

The process for controlling plans from the Admin Dashboard:

- **Create:** Admin can set the Plan name, price, and Storage Limit and insert them into the Database (plans table).
- **Edit:** Can modify price or Storage Limit. (Note: Modified data only applies to "future buyers/upgrades" and must not affect the current plans of existing users).
- **Soft Delete (Inactive):** Never execute a Hard Delete on a plan. This could cause errors for users currently subscribed to it. Instead, simply change `is_active = false`. The frontend must only display Active plans for users to choose from.

## 3. File Upload & Validation Module

This module handles accepting CSV files and validating their compliance with requirements.

- **File Upload UI:** Must include an upload area (Drag & drop or Browse) on the Retail Manager Dashboard.
- **Format Validation:** Uploaded files must solely be in `.csv` format. Other formats must be rejected immediately with an Error Message.
- **Size Validation:** Verify that the file size does not exceed `75MB` for first-time free users.
- **Storage:** Uploaded files must be securely stored on System Storage or Cloud Storage (e.g., AWS S3).

### 1. Database Schema (Enhanced)

Based on the provided Schema, the necessary `status` field has been added.

- `dataset_id`: INT (Primary Key, Auto Increment)
- `user_id`: INT (Foreign Key -> users table)
- `file_name`: VARCHAR (The original name uploaded by the user - e.g., `sales_data.csv`)
- `file_path`: VARCHAR (The storage path on CloudFlare R2 - e.g., `datasets/user_1/uuid-sales_data.csv`)
- `file_size`: INT (File size in Bytes or KB)
- `row_count`: INT (Total data rows in the CSV)
- `status`: ENUM (`UPLOADED`, `ANALYSIS_IN_PROGRESS`, `COMPLETED`, `FAILED`) - *Default: `UPLOADED`*
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP
    
### 2. File Upload & Validation Flow

- **CSV Template Enforcement:**
    - The accepted CSV must contain at least 2 mandatory columns. (e.g., `Product_Name` and `Review_Text`). To make it easy for Retail Managers, a sample file must be available on the Dashboard via a **"Download CSV Template"** feature.

**Step 1: Frontend (Client-side) Validation**
- Add a Drag & Drop upload area on the Dashboard.
- Check if the file is `.csv` directly in the browser.
- Roughly check if the file size exceeds 75MB (for free trial users) and display an error immediately without sending it to the backend if it fails.

**Step 2: Backend Validations (Security & Quota Checks)**
- **MIME Type Check:** Beyond checking the `.csv` extension, strictly verify if the MIME type is `text/csv` (or genuine CSV format) to prevent malicious files.
- **First-Time or Subscription Check:** (Logic from Module 2 applies here)
    - If User's `has_used_free_trial = false` -> Check if file size is under 75MB. (Pass if Yes).
    - If `true` -> Check for an Active Plan in the `user_subscriptions` table. Verify if the combined size of the current file and used storage exceeds the Plan Max Quota. (Pass if Yes).
        
**Step 3: CSV Integrity Check & Row Count Extraction**
- If all validations pass, the Backend will accept the file into temporary Memory (or Temp Folder).
- Perform a basic check on CSV Headers (ensure required columns for analysis like `review_text` are present).
- Stream-read the file to count and record the total `row_count`.
    
**Step 4: Upload to Cloudflare R2**
- Generate a new unique file name (Unique Key).
    - *Format:* `{user_id}/{timestamp}_{original_filename}`
    - *Example:* `104/1691234567_feedback.csv`
- Use the AWS S3 SDK from the Backend (Cloudflare R2 is S3 Compatible) to upload the file to the R2 Bucket.
- Retrieve the `file_path` on R2 upon successful upload.
    
**Step 5: Database Metadata Saving & Quota Deduction**
- Once successfully uploaded to R2, insert the resulting data (`user_id`, `file_name`, `file_path`, `file_size`, `row_count`, `status: UPLOADED`) into the `datasets` table.
- (If Paid User) - Add the current file size to `used_storage_mb` in the `user_subscriptions` table and Update.
- Return an "Upload Successful" response and Dataset details to the Frontend.

## 4. Aspect-Based Sentiment Analysis & Reporting Module

This module is the Core Engine, handling data processing.

- **Data Processing:** Read data from the uploaded CSV file, send it to the Aspect-Based Sentiment Analysis Model, and process it.
- **Result Dashboard (Visualization):**
    - Display the resulting analysis clearly on the Retail Manager's Dashboard.
    - For example, visualize via charts and graphs how much Positive/Negative/Neutral sentiment exists for specific Aspects (e.g., Battery, Screen, Customer Service).
- **Export Function:** The user must be able to Download (Export) the resulting Analysis data as a CSV or Excel format.

#### 1. Pre-processing & Data Cleansing

The step to cleanse the file after it's uploaded by the user and re-downloaded from CloudFlare R2.

- **CSV Template Enforcement:**
    - The accepted CSV must contain at least 2 mandatory columns. (e.g., `Product_Name` and `Review_Text`). To make it easy for Retail Managers, a sample file must be available on the Dashboard via a **"Download CSV Template"** feature.
- **Fallback Logic (Implementing Method 4):**
    - If rows contain empty (Blank/Null) data in the `Product_Name` column, the System will automatically substitute them with **"General / Store Feedback"**. (This allows separate tracking of reviews regarding store service).
- **Data Cleaning:**
    - Remove rows missing `Review_Text` (blank reviews).
    - Strip URLs, HTML Tags, Emojis, and meaningless punctuation from the review text.
    - Convert text to Lowercase. (e.g., To treat "Screen" and "screen" as identical).
        
#### 2. Processing Engine (ASTE Model & Background Job)

Because PyABSA (ASTE Model) takes time to run, users cannot be left waiting. A background processing system is required.

- **Background Worker Setup:**
    - Change the Status in the Datasets Table to `ANALYSIS_IN_PROGRESS` right after file upload.
    - Send the Analysis Process to run on **Celery (Python)** or a similar background worker. Display "Analysis is processing..." on the Dashboard.
- **PyABSA ASTE Execution:**
    - Send pre-processed sentences to the PyABSA Model to Extract `{Aspect, Opinion, Polarity}`.
- **Database Saving:**
    - Save results into the `sentiment_results` Table.
    - **Table Design:** `id`, `dataset_id`, **`product_name`** (Name from Template or General Feedback), `aspect`, `opinion`, `polarity`, `created_at`.
- **Completion:**
    - Upon analysis completion, change the Status in the Datasets Table to `COMPLETED` and notify the User.
        
#### 3. Visual Presentation Dashboard (Actionable Insights)

Once analysis concludes, data will be presented in 3 layers to help Retail Managers make decisions.

- **Level 1: Overall Overview**
    - **Scorecards:** Display total feedback count, alongside Positive, Negative, and Neutral counts in large numbers.
    - **Pie Chart:** Percentage ratio of the 3 sentiments (Positive, Negative, Neutral) on a store-wide scale.
- **Level 2: Aspect-Level Analysis**
    - **Stacked Bar Chart:** Display most discussed Aspects (e.g., battery, screen, customer service) via Bar Chart. By color-coding each bar with Positive (Green), Negative (Red), and Neutral (Yellow), strengths and weaknesses can be identified instantly.
- **Level 3: Product-Level Actionable Views**
    - **Product Filter Dropdown:** A selector to view by specific Product name or "General / Store Feedback".
    - **Actionable Table (Product Performance):**
        - Compare Top Positive Opinions and Top Negative Opinions for individual products using a Table.
        - For example - Selecting *iPhone 15* will clearly show (Aspect: Camera -> Opinion: Excellent -> Polarity: Positive), etc.
    - **Opinion Word Cloud (Optional but Recommended):** Display the most frequently used customer words (great, bad, slow, fast) per product in a Word Cloud format.
        
#### 4. File Export

Allow exporting Dashboard data for use in other meetings or reports.

- **Raw Data Export (.csv):** Allow downloading detailed, analyzed data containing `product_name`, `aspect`, `opinion`, and `polarity` as a CSV. (For Data Analysts or users who want to proceed in Excel).
- **Aggregated Summary Export (.csv / .xlsx):** Allow exporting summary counts (e.g., Samsung S23 has 20 Positive, 5 Negative) per product as a Report.

## 5. Admin Management Module

This module allows the Super Admin to oversee and control the entire system.

- **System Overview Dashboard:**
    - Must display the total number of Users actively using the system (Total Active Users).
    - Total number of CSV files entering the system.
- **User Management:**
    - **User List:** View all Retail Manager (User) accounts as a List.
    - **User Detail & Activity:** View details of individual users (e.g., how many CSVs uploaded, when they uploaded them).
    - **Subscription Status:** View which Subscription Plan an individual user is currently utilizing.

#### 1. System Overview Dashboard

The primary page upon Admin Login, displaying system health and progress.

- **Key Metrics:**
    - **Total Users:** Total number of system users (Both Free and Paid Users).
    - **Active Subscriptions:** Total users currently utilizing an active Subscription Plan (e.g., How many Basic, how many Pro).
    - **Total Processed Files:** Total number of CSV files entered and analyzed by the system.
    - **Total Storage Used:** Total Storage volume of all user-uploaded files on Cloudflare R2 (To calculate SaaS costs).
- **Recent Activity Feed:**
    - Log of the last 5 or 10 uploaded files (Displays roughly which User uploaded it, and if Analysis was successful/failed `COMPLETED / FAILED`).
        
#### 2. User Management

The section to closely monitor and control Retail Managers.

- **User List Table:**
    - Display all Users via a table. (Name, Email, Current Plan, Joined Date)
    - **Search & Filter:** Search Users by Email. Filter by active users vs users with expired plans. Include Pagination (e.g., 20 Users per page).
- **User Detail Profile:**
    - **Profile Info:** Name, Email, Start Date.
    - **Subscription & Quota Status:**
        - Current Plan in use, and expiration date.
        - Display used Quota (e.g., 150MB / 300MB used) via a Progress Bar.
    - **Activity/Dataset History:**
        - Display a table listing all CSV files uploaded by this User (File Name, Size, Row Count, Upload Date, Status).
- **Admin Actions:**
    - **Block/Suspend User:** Include a Suspend button to temporarily block rule-breaking users or users with Payment issues. (If blocked, the user can no longer log in).
        
#### 3. Plan & Pricing Management

Admin must easily adjust or change the Subscription Plans discussed in Module 2 from here.

- **Plan List:** View currently sold plans (Basic, Pro) in the System.
- **Create New Plan:** Create a new plan (e.g., Enterprise) by setting Name, Price, Storage Limit (MB), and Duration (Days).
- **Edit Plan:** Modify pricing and Storage Quota for existing plans.
- **Toggle Active/Inactive:** Instead of completely deleting Plans (to prevent Database Errors), only allow marking them "Inactive". Retail Managers cannot purchase Inactive plans (existing subscribers can continue using them until expiration).
    
#### 4. Security & Access Control

Special checks are required on both Backend and Frontend to grant access to this Module.

- **Route Protection:** Grant access to Admin Dashboard URLs (e.g., `/admin/dashboard`, `/admin/users`) only with a Token having the `ADMIN` Role. Reject and return `403 Forbidden Access` if accessed with a Retail Manager Token.
- **No Admin Registration:** Absolutely no external registration for new Admin accounts. If a new Admin account is needed, it must be manually added to the Database (via Seeder/Script).

## 6. Tech Stack

### 1. Frontend Stack (Retail Manager & Admin Dashboards)
- **Core:** React + TypeScript (Vite)
- **Routing:** React Router DOM
- **Styling & UI:** Tailwind CSS + ShadCN UI
- **Icons:** Lucide React
- **State Management & API:** TanStack Query (React Query)
- **Data Grid:** TanStack Table (For Admin User List, Product Result Table)
- **Charts:** Recharts or Chart.js (For drawing Pie/Bar Charts on Dashboard)
    
### 2. Core Backend Stack (Business Logic & API Gateway)
- **Core:** Express.js + TypeScript
- **ORM:** Drizzle ORM
- **Authentication:** jsonwebtoken (JWT), bcrypt (Password Hash)
- **File Upload:** Multer (To accept CSV files)
- **Validation:** Zod (To validate API Requests and Data Types)
- **Storage Client:** `@aws-sdk/client-s3` (To upload CSV to Cloudflare R2)
    
### 3. Data Processing Stack (AI / ML Microservice) - *Updated*
- **Core:** Python + FastAPI Framework
- **Background Processing:** **FastAPI `BackgroundTasks`** (Instead of Redis/Celery, will utilize FastAPI's Built-in Background Thread).
- **Data Processing:** Pandas, PyABSA (ASTE Model) https://pyabsa.readthedocs.io/en/latest/6_tutorials/Aspect_Sentiment_Triplet_Extraction.html
- **Database Client:** `psycopg2` or `SQLAlchemy` (To directly insert results from Python into Neon DB).
    
### 4. Database & Storage (No Cache) - *Updated*
- **Database:** PostgreSQL (Hosted on Neon.tech)
- **File Storage:** Cloudflare R2

## 7. System Architecture Flow (Architecture Flow without Cache)

Since Cache/Broker is removed, the 7 steps defining the entire system workflow are as follows:

**Step 1: Upload Initiation** - Upload CSV file from Frontend (React) to Express.js Backend.

**Step 2: Validation & Cloud Storage** - Express verifies Subscription Quota, File Size, and CSV Format. If all pass, uploads the file to Cloudflare R2 using AWS SDK.

**Step 3: Database Metadata Saving** - Express retrieves the resulting `file_path` on R2 and logs it in the Neon DB `datasets` table with `status: ANALYSIS_IN_PROGRESS`.

**Step 4: Trigger AI API (The Bridge)** - Express sends an HTTP POST request to Python FastAPI (Data sent: `dataset_id` and `file_path`).

**Step 5: Async Processing Acceptance (Crucial Step)** - As soon as FastAPI receives the Request, it delegates the PyABSA execution task to **`BackgroundTasks`**. It then immediately returns a `202 Accepted` response (Job accepted) to Express. (This prevents HTTP Connection Timeout between Express and Frontend).

**Step 6: AI Execution & Direct DB Update** - The backend FastAPI Background Thread will:
- Download the CSV file from R2.
- Analyze Sentiments (Aspect, Opinion, Polarity) using PyABSA.
- Once analyzed, FastAPI connects directly to Neon DB and inserts the results into the `sentiment_results` table.
- Change the `status` in the `datasets` table to `COMPLETED`.
    
**Step 7: Frontend Polling & Display** - The TanStack Query on the Frontend will poll Express for Status every 5 or 10 seconds while analysis runs in the background. When Express checks the Database and confirms `COMPLETED`, the Frontend will fetch the Analysis Data and display it on the Dashboard using Charts and Tables.

## 8. Non Functional Requirement

### 1. User Experience (UX) & Usability

ML Models processing can take anywhere from 5 minutes to half an hour. To avoid frustrating the user, the following NFRs must be defined:

- **Asynchronous Processing:** After file upload, users should not be forced to stare at a frozen screen (Giant Loading Spinner). Must allow navigation back to the Dashboard with a message like "Analysis started".
- **Progress Tracking & Feedback:**
    - **Status Indicators:** Clearly display stages such as `Uploading...`, `Queued`, `Processing...`, `Completed`, `Failed`.
    - **Estimated Time (Optional):** It is preferable to display a rough estimate based on file Size or Row Count, like "Estimated completion: ~10 minutes".
- **Notifications:** Upon analysis completion or failure, display an In-app Notification (Toast or Bell Icon) on the Web App for the User.
- **Graceful Error Handling:** Whether due to incorrect file format or processing failure, provide a clear, actionable message (e.g., "Your CSV file is missing the 'Review_Text' column") rather than a generic "Something went wrong".
    
### 2. Performance & Responsiveness

- **API Response Time:** Except for File Uploads, other API Requests (e.g., viewing Dashboard, loading Charts) should not exceed a Response Time of `500ms (half a second)`.
- **Data Visualization Load Time:** Result Data could span hundreds of thousands of rows. To prevent browser lag when rendering charts on the Frontend, the Backend (Express) must calculate and send only the Summary (Aggregated Data) rather than all raw data.
- **Pagination & Lazy Loading:** Avoid rendering all data at once on Admin User Lists or Manager Analysis tables; utilize Pagination (e.g., 10/20 rows per page).
    
### 3. Security & Data Privacy

Since Retail Manager Customer Data is handled, security is paramount.

- **Data Isolation (Tenant Isolation):** User B must absolutely (under no circumstances) have access to User A's files and Analysis Results. Strictly cross-verify the `user_id` inside the Token at every API Endpoint.
- **Secure File Storage:** Files uploaded to R2 must not be granted Public Access; they must be configured (Private Bucket) to only be readable via the System Backend.
- **Input Sanitization:** Uploaded CSVs may contain Malicious Scripts (e.g., XSS Attack), so they must be thoroughly Sanitized before insertion into the Database or rendering on the Frontend.
- **Rate Limiting:** Implement Rate Limits on APIs (especially Login and Upload APIs) to prevent Bot Spamming (e.g., maximum 5 Uploads per minute).
    
### 4. Scalability & Reliability

- **Stateless Architecture:** Write the Express.js Backend to be Stateless. (Meaning sessions are stored in JWT/Database, not Server Memory). This ensures no issues if scaling out to 2 or 3 Express Servers as User count grows.
- **Fault Tolerance:** If Python FastAPI crashes due to RAM overload during processing, data must not vanish into thin air. If the Status in the `datasets` table gets stuck on `ANALYSIS_IN_PROGRESS`, there should be a backend mechanism to Retry, or a manual "Retry" button for the Admin.
- **Availability:** Opting for Serverless/Managed Services like Neon DB and R2 inherently fulfills the NFR of targeting a 99.9% System Uptime.
    
### 5. Maintainability & Logging

- **Centralized Logging:** Utilize `Winston` or `Morgan` (for Express) alongside Python Standard Logging to properly record logs so that errors (especially in FastAPI Model Analysis) are traceable. (Storing them locally as files is acceptable for the MVP stage).

## ENV Examples
### client directory env
VITE_API_URL=http://localhost:8000

### server directory env
#DB Variables

DATABASE_URL=

#CloudFlare R2 Variables

R2_BUCKET_NAME=

R2_ACCOUNT_ID=

R2_ACCESS_KEY_ID=

R2_SECRET_ACCESS_KEY=

R2_ENDPOINT=

FRONTEND_URL=

### worker directory env

#DB Variables

DATABASE_URL=

#CloudFlare R2 Variables

R2_BUCKET_NAME=

R2_ACCOUNT_ID=

R2_ACCESS_KEY_ID=

R2_SECRET_ACCESS_KEY=

R2_ENDPOINT=

FRONTEND_URL=