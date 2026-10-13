# Feedbacks Module – Full Implementation Plan

This document is the complete implementation guide for the **Feedbacks** module.

**Scope**
- Users submit support requests from the **Help & Support** page
- Admins manage all requests in a **Manage User Feedbacks** tab
- Admins reply to users **via email** (reply text is **not** stored in the database)
- Status workflow: `pending` → `sent` → `replied`

---

## 1. Database Schema

### Table: `feedbacks`

| Column        | Type                          | Constraints                          | Description                                      |
|---------------|-------------------------------|--------------------------------------|--------------------------------------------------|
| `feedback_id` | `INT`                         | `PRIMARY KEY`, `AUTO_INCREMENT`      | Unique identifier                                |
| `retailer_id` | `INT`                         | `FOREIGN KEY` → `users(id)`          | User who submitted the feedback                  |
| `subject`     | `VARCHAR(255)`                | `NOT NULL`                           | Short title                                      |
| `message`     | `TEXT`                        | `NOT NULL`                           | Detailed message                                 |
| `status`      | `ENUM('pending','sent','replied')` | `NOT NULL`, `DEFAULT 'pending'` | Workflow status                                  |
| `created_at`  | `TIMESTAMP`                   | `DEFAULT CURRENT_TIMESTAMP`          | Submission time                                  |
| `replied_by`  | `INT`                         | `FOREIGN KEY` → `users(id)`, nullable | Admin who sent the email reply                   |

### SQL (PostgreSQL)

```sql
CREATE TYPE feedback_status AS ENUM ('pending', 'sent', 'replied');

CREATE TABLE feedbacks (
    feedback_id   SERIAL PRIMARY KEY,
    retailer_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject       VARCHAR(255) NOT NULL,
    message       TEXT NOT NULL,
    status        feedback_status NOT NULL DEFAULT 'pending',
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    replied_by    INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_feedbacks_retailer_id ON feedbacks(retailer_id);
CREATE INDEX idx_feedbacks_status ON feedbacks(status);
CREATE INDEX idx_feedbacks_created_at ON feedbacks(created_at DESC);
```

> Adjust the foreign-key target (`users` table) to match your existing user model.

---

## 2. Status Workflow

| Status    | Meaning                                      | Who sets it          |
|-----------|----------------------------------------------|----------------------|
| `pending` | Just submitted by the user                   | System (default)     |
| `sent`    | Admin has seen / acknowledged the feedback   | Admin                |
| `replied` | Admin has sent an email reply                | Admin (after email)  |

When status becomes `replied`, `replied_by` is set to the admin’s user ID.

---

## 3. Backend API (Express + Node.js)

### 3.1 Routes Overview

| Method | Endpoint                        | Auth       | Description                                      |
|--------|---------------------------------|------------|--------------------------------------------------|
| `POST` | `/api/feedbacks`                | User       | Submit new feedback                              |
| `GET`  | `/api/feedbacks/my`             | User       | List current user’s own feedbacks                |
| `GET`  | `/api/feedbacks`                | Admin      | List all feedbacks (with filters + pagination)   |
| `GET`  | `/api/feedbacks/:id`            | Admin      | Get single feedback detail                       |
| `PATCH`| `/api/feedbacks/:id/status`     | Admin      | Update status to `sent`                          |
| `POST` | `/api/feedbacks/:id/reply`      | Admin      | Send email reply + set status to `replied`       |

### 3.2 Controllers

#### POST `/api/feedbacks` – User submits feedback

```js
const createFeedback = async (req, res) => {
  try {
    const { subject, message } = req.body;
    const retailer_id = req.user.id;

    if (!subject?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }
    if (subject.length > 255) {
      return res.status(400).json({ error: 'Subject must be 255 characters or less' });
    }

    const result = await db.query(
      `INSERT INTO feedbacks (retailer_id, subject, message, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING feedback_id, subject, status, created_at`,
      [retailer_id, subject.trim(), message.trim()]
    );

    res.status(201).json({
      message: 'Feedback submitted successfully',
      data: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
};
```

#### GET `/api/feedbacks/my` – User’s own list

```js
const getMyFeedbacks = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT feedback_id, subject, message, status, created_at
       FROM feedbacks
       WHERE retailer_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feedbacks' });
  }
};
```

#### GET `/api/feedbacks` – Admin list (with filters)

Query parameters:
- `status` (optional): `pending` | `sent` | `replied`
- `search` (optional): search in subject / message
- `page` (default 1)
- `limit` (default 20)

```js
const getAllFeedbacks = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let where = [];
    let params = [];
    let paramIndex = 1;

    if (status) {
      where.push(`f.status = $${paramIndex++}`);
      params.push(status);
    }
    if (search) {
      where.push(`(f.subject ILIKE $${paramIndex} OR f.message ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countResult = await db.query(
      `SELECT COUNT(*) FROM feedbacks f ${whereClause}`,
      params
    );

    const dataResult = await db.query(
      `SELECT 
         f.feedback_id, f.subject, f.message, f.status, f.created_at, f.replied_by,
         u.name AS retailer_name, u.email AS retailer_email
       FROM feedbacks f
       JOIN users u ON u.id = f.retailer_id
       ${whereClause}
       ORDER BY f.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    res.json({
      data: dataResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch feedbacks' });
  }
};
```

#### GET `/api/feedbacks/:id` – Admin detail

```js
const getFeedbackById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT 
         f.*, 
         u.name AS retailer_name, u.email AS retailer_email
       FROM feedbacks f
       JOIN users u ON u.id = f.retailer_id
       WHERE f.feedback_id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
};
```

#### PATCH `/api/feedbacks/:id/status` – Mark as Sent

```js
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'sent') {
      return res.status(400).json({ error: 'Only status "sent" is allowed here' });
    }

    const result = await db.query(
      `UPDATE feedbacks
       SET status = 'sent'
       WHERE feedback_id = $1 AND status = 'pending'
       RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Feedback not found or already processed' });
    }

    res.json({ message: 'Status updated to sent', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
};
```

#### POST `/api/feedbacks/:id/reply` – Send Email Reply + Mark as Replied

```js
const replyToFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { replyMessage } = req.body;
    const adminId = req.user.id;

    if (!replyMessage?.trim()) {
      return res.status(400).json({ error: 'Reply message is required' });
    }

    // 1. Fetch feedback + retailer email
    const feedbackResult = await db.query(
      `SELECT f.*, u.email AS retailer_email, u.name AS retailer_name
       FROM feedbacks f
       JOIN users u ON u.id = f.retailer_id
       WHERE f.feedback_id = $1`,
      [id]
    );

    if (feedbackResult.rowCount === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    const feedback = feedbackResult.rows[0];

    if (feedback.status === 'replied') {
      return res.status(400).json({ error: 'This feedback has already been replied to' });
    }

    // 2. Send email
    await sendEmail({
      to: feedback.retailer_email,
      subject: `Re: ${feedback.subject}`,
      text: replyMessage.trim(),
      html: `
        <p>Hi ${feedback.retailer_name},</p>
        <p>${replyMessage.trim().replace(/\n/g, '<br>')}</p>
        <hr>
        <p><strong>Original message:</strong></p>
        <p>${feedback.message.replace(/\n/g, '<br>')}</p>
      `
    });

    // 3. Update status
    const updateResult = await db.query(
      `UPDATE feedbacks
       SET status = 'replied', replied_by = $1
       WHERE feedback_id = $2
       RETURNING *`,
      [adminId, id]
    );

    res.json({
      message: 'Reply sent successfully',
      data: updateResult.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send reply' });
  }
};
```

> `sendEmail` should use your existing email service (Nodemailer, Resend, SendGrid, etc.).

### 3.3 Middleware

- All routes require JWT authentication.
- Admin-only routes (`GET /api/feedbacks`, `GET /:id`, `PATCH /:id/status`, `POST /:id/reply`) must check `req.user.role === 'admin'`.
- Rate-limit `POST /api/feedbacks` (e.g. 5 submissions per hour per user).

### 3.4 File Structure

```
server/
├── routes/
│   └── feedbacks.js
├── controllers/
│   └── feedbackController.js
├── services/
│   └── emailService.js          # existing or new sendEmail helper
└── middleware/
    └── auth.js
```

---

## 4. Frontend – User Side (Help & Support Page)

### 4.1 Location

Place the form on the existing **Help & Support** page  
(e.g. `src/pages/HelpSupport.jsx` or equivalent).

### 4.2 Feedback Form Component

```tsx
// src/components/support/FeedbackForm.tsx
import { useState } from 'react';
import api from '@/lib/api';

export default function FeedbackForm() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!subject.trim() || !message.trim()) {
      setError('Please fill in both subject and message.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/feedbacks', {
        subject: subject.trim(),
        message: message.trim(),
      });
      setSuccess(true);
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit feedback.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow">
      <h2 className="text-2xl font-semibold mb-2">Contact Support</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Have a question or need help? Send us a message and our team will get back to you by email.
      </p>

      {success && (
        <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg">
          Thank you! Your feedback has been submitted. We will reply by email.
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="subject" className="block text-sm font-medium mb-1">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            id="subject"
            type="text"
            maxLength={255}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Brief summary of your issue"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-1">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-y"
            placeholder="Describe your issue or question in detail..."
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-60 transition"
        >
          {loading ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
}
```

### 4.3 Integration

```tsx
// Inside HelpSupport page
<section className="mt-12">
  <FeedbackForm />
</section>
```

---

## 5. Frontend – Admin Side (Manage User Feedbacks Tab)

### 5.1 Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Manage User Feedbacks                        [Pending: 7]      │
├─────────────────────────────────────────────────────────────────┤
│  [Search............]  [Status ▼]  [Refresh]                    │
├─────────────────────────────────────────────────────────────────┤
│  ID  │ Subject              │ From          │ Status  │ Created │ Actions │
│  #42 │ Billing question...  │ John Doe      │ pending │ 2h ago  │  View   │
│  #41 │ Feature request      │ Jane Smith    │ replied │ 1d ago  │  View   │
│  ... │                      │               │         │         │         │
├─────────────────────────────────────────────────────────────────┤
│                        < Pagination >                           │
└─────────────────────────────────────────────────────────────────┘
```

Clicking **View** opens a detail drawer / modal.

### 5.2 Detail Drawer / Modal

**Header**
- Subject
- Status badge
- Created date
- Retailer name + email

**Body**
- Full message text

**Actions**
- **Mark as Sent** (only when status = `pending`)
- **Reply** (only when status ≠ `replied`) → opens reply form
- Close

### 5.3 Reply Form (inside the same drawer or a second modal)

- **To**: Retailer email (read-only)
- **Subject**: `Re: {original subject}` (read-only)
- **Message**: Textarea for admin’s reply
- Buttons: **Send Reply** / **Cancel**

On successful send:
- Status changes to `replied`
- Drawer closes or refreshes
- Success toast shown

### 5.4 Status Badge Colors

| Status    | Color  |
|-----------|--------|
| `pending` | Yellow |
| `sent`    | Blue   |
| `replied` | Green  |

### 5.5 Key Frontend Functions

| Function            | Description                                      |
|---------------------|--------------------------------------------------|
| Fetch list          | `GET /api/feedbacks` with filters + pagination   |
| View detail         | `GET /api/feedbacks/:id`                         |
| Mark as Sent        | `PATCH /api/feedbacks/:id/status` `{ status: 'sent' }` |
| Send Reply          | `POST /api/feedbacks/:id/reply` `{ replyMessage }` |
| Search / Filter     | Query params on list endpoint                    |
| Pending count badge | Count of items with status = `pending`           |

---

## 6. Implementation Checklist

### Database
- [ ] Run the SQL migration to create `feedbacks` table and indexes

### Backend
- [ ] Create `routes/feedbacks.js` and `controllers/feedbackController.js`
- [ ] Implement all 6 endpoints listed above
- [ ] Protect routes with JWT + admin role check
- [ ] Integrate email sending in the reply endpoint
- [ ] Add rate limiting on user submit endpoint

### Frontend – User
- [ ] Create `FeedbackForm` component
- [ ] Add it to the Help & Support page
- [ ] Handle success / error states

### Frontend – Admin
- [ ] Create Manage User Feedbacks page / tab
- [ ] Table with search, status filter, pagination
- [ ] Detail drawer / modal
- [ ] Mark as Sent action
- [ ] Reply form + email send action
- [ ] Status badges and pending count

### Testing
- [ ] User can submit feedback → appears as `pending`
- [ ] Admin can view list and detail
- [ ] Admin can mark as `sent`
- [ ] Admin can send email reply → status becomes `replied` + `replied_by` is set
- [ ] User cannot access admin endpoints

---

**End of Implementation Plan**
