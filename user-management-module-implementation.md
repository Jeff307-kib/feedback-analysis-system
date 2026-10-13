# User Management Module – Full Implementation Plan

This document is the complete implementation guide for the **Admin – Manage User Accounts** module.

**Scope**
- Only two roles exist: `user` and `admin`
- Admin can list, view, edit basic info, suspend/reactivate, soft-delete users
- Admin can view a user’s support feedbacks
- No role changing, no subscription/quota changes, no password reset, no dataset viewing from this module

---

## 1. Database Changes

### 1.1 Add `status` column to `users` table

```sql
-- Add status column
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');

ALTER TABLE users
ADD COLUMN status user_status NOT NULL DEFAULT 'active';

-- Optional but recommended index
CREATE INDEX idx_users_status ON users(status);
```

| Status      | Meaning                                      |
|-------------|----------------------------------------------|
| `active`    | Normal account, can log in                   |
| `suspended` | Temporarily blocked, cannot log in           |
| `deleted`   | Soft-deleted, hidden from normal lists       |

> Existing users will automatically get `active` because of the default value.

### 1.2 Related tables (already exist)
- `feedbacks` (from previous module) – linked via `retailer_id`
- No new tables are required for this module

---

## 2. Backend API (Express + Node.js)

### 2.1 Routes Overview

| Method  | Endpoint                          | Auth   | Description                                      |
|---------|-----------------------------------|--------|--------------------------------------------------|
| `GET`   | `/api/admin/users`                | Admin  | List all users (with filters + pagination)       |
| `GET`   | `/api/admin/users/:id`            | Admin  | Get single user detail                           |
| `PATCH` | `/api/admin/users/:id`            | Admin  | Edit basic info (name, email)                    |
| `PATCH` | `/api/admin/users/:id/status`     | Admin  | Suspend / Reactivate / Soft-delete               |
| `GET`   | `/api/admin/users/:id/feedbacks`  | Admin  | List feedbacks submitted by this user            |

All routes must be protected by JWT + `req.user.role === 'admin'`.

### 2.2 Controllers

#### GET `/api/admin/users` – List users

Query parameters:
- `search` (optional) – search in name or email
- `status` (optional) – `active` | `suspended` | `deleted`
- `role` (optional) – `user` | `admin`
- `page` (default 1)
- `limit` (default 20)

```js
const getAllUsers = async (req, res) => {
  try {
    const { search, status, role, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let where = [];
    let params = [];
    let paramIndex = 1;

    // Always hide hard-deleted if you ever add that later; for now we include soft-deleted when filtered
    if (status) {
      where.push(`u.status = $${paramIndex++}`);
      params.push(status);
    } else {
      // By default do not show soft-deleted users
      where.push(`u.status != 'deleted'`);
    }

    if (role) {
      where.push(`u.role = $${paramIndex++}`);
      params.push(role);
    }

    if (search) {
      where.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countResult = await db.query(
      `SELECT COUNT(*) FROM users u ${whereClause}`,
      params
    );

    const dataResult = await db.query(
      `SELECT 
         u.id, u.name, u.email, u.role, u.status, u.created_at
       FROM users u
       ${whereClause}
       ORDER BY u.created_at DESC
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
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};
```

#### GET `/api/admin/users/:id` – User detail

```js
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT id, name, email, role, status, created_at
       FROM users
       WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};
```

#### PATCH `/api/admin/users/:id` – Edit basic info

```js
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    if (!name?.trim() && !email?.trim()) {
      return res.status(400).json({ error: 'At least one field (name or email) is required' });
    }

    // Optional: check email uniqueness if email is being changed
    if (email) {
      const existing = await db.query(
        `SELECT id FROM users WHERE email = $1 AND id != $2`,
        [email.trim(), id]
      );
      if (existing.rowCount > 0) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    const result = await db.query(
      `UPDATE users
       SET 
         name  = COALESCE($1, name),
         email = COALESCE($2, email)
       WHERE id = $3
       RETURNING id, name, email, role, status, created_at`,
      [
        name?.trim() || null,
        email?.trim() || null,
        id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User updated successfully', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user' });
  }
};
```

#### PATCH `/api/admin/users/:id/status` – Suspend / Reactivate / Soft-delete

```js
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'deleted'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Allowed: active, suspended, deleted' });
    }

    // Prevent admin from suspending/deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot change your own status' });
    }

    const result = await db.query(
      `UPDATE users
       SET status = $1
       WHERE id = $2
       RETURNING id, name, email, role, status, created_at`,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: `User status updated to ${status}`, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user status' });
  }
};
```

#### GET `/api/admin/users/:id/feedbacks` – User’s feedbacks

```js
const getUserFeedbacks = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // First check user exists
    const userCheck = await db.query(`SELECT id FROM users WHERE id = $1`, [id]);
    if (userCheck.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM feedbacks WHERE retailer_id = $1`,
      [id]
    );

    const dataResult = await db.query(
      `SELECT feedback_id, subject, message, status, created_at, replied_by
       FROM feedbacks
       WHERE retailer_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
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
    res.status(500).json({ error: 'Failed to fetch user feedbacks' });
  }
};
```

### 2.3 Middleware Notes

- All routes require:
  - Valid JWT
  - `req.user.role === 'admin'`
- Login middleware / auth guard should also check `status === 'active'`.  
  Suspended or deleted users must not be able to log in.

Example login check:

```js
if (user.status !== 'active') {
  return res.status(403).json({ error: 'Account is suspended or deleted' });
}
```

### 2.4 File Structure

```
server/
├── routes/
│   └── adminUsers.js
├── controllers/
│   └── adminUserController.js
└── middleware/
    └── auth.js          # existing + role check
```

---

## 3. Frontend – Admin Manage Users Page

### 3.1 Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Manage Users                                                   │
├─────────────────────────────────────────────────────────────────┤
│  [Search by name or email...]  [Status ▼]  [Role ▼]  [Refresh]  │
├─────────────────────────────────────────────────────────────────┤
│  ID │ Name          │ Email              │ Role  │ Status    │ Joined   │ Actions │
│  12 │ John Doe      │ john@email.com     │ user  │ active    │ 2d ago   │ View    │
│  11 │ Jane Admin    │ jane@admin.com     │ admin │ active    │ 5d ago   │ View    │
│  10 │ Old User      │ old@email.com      │ user  │ suspended │ 1m ago   │ View    │
├─────────────────────────────────────────────────────────────────┤
│                        < Pagination >                           │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 User Detail Drawer / Modal

**Header**
- Name + Email
- Role badge
- Status badge
- Joined date

**Body – Basic Info**
- Editable fields: Name, Email
- Save button

**Body – Status Actions**
- Button: **Suspend** (when status = active)
- Button: **Reactivate** (when status = suspended)
- Button: **Soft Delete** (when status ≠ deleted)
- Confirmation dialogs for Suspend and Soft Delete

**Body – User’s Feedbacks**
- Table or list of feedbacks submitted by this user
- Columns: Subject, Status, Created, View link (optional)
- Pagination if many feedbacks

### 3.3 Status Badge Colors

| Status      | Color  |
|-------------|--------|
| `active`    | Green  |
| `suspended` | Yellow / Orange |
| `deleted`   | Red / Gray |

### 3.4 Key Frontend Functions

| Function              | API Call                                      |
|-----------------------|-----------------------------------------------|
| List users            | `GET /api/admin/users`                        |
| View user detail      | `GET /api/admin/users/:id`                    |
| Edit name / email     | `PATCH /api/admin/users/:id`                  |
| Change status         | `PATCH /api/admin/users/:id/status`           |
| Load user feedbacks   | `GET /api/admin/users/:id/feedbacks`          |

---

## 4. Status Flow

```
active  ←→  suspended
  ↓
deleted  (soft delete – one way in normal flow)
```

- From `active` → can Suspend or Soft Delete
- From `suspended` → can Reactivate or Soft Delete
- From `deleted` → normally hidden; only visible when filter = deleted (no reactivate in this version)

---

## 5. Implementation Checklist

### Database
- [ ] Add `user_status` ENUM type
- [ ] Add `status` column to `users` table with default `'active'`
- [ ] Create index on `status`

### Backend
- [ ] Create `routes/adminUsers.js` and controller
- [ ] Implement all 5 endpoints
- [ ] Protect with admin role check
- [ ] Update login/auth middleware to block non-`active` users
- [ ] Prevent admin from changing their own status

### Frontend
- [ ] Create Manage Users page / tab
- [ ] Table with search, status filter, role filter, pagination
- [ ] Detail drawer / modal
- [ ] Edit name & email form
- [ ] Suspend / Reactivate / Soft Delete actions with confirmation
- [ ] Section to list the user’s feedbacks
- [ ] Status badges

### Testing
- [ ] Admin can list users and filter by status/role
- [ ] Admin can edit name and email
- [ ] Admin can suspend → user cannot log in
- [ ] Admin can reactivate → user can log in again
- [ ] Soft delete hides user from default list
- [ ] Admin can view a user’s feedbacks
- [ ] Admin cannot change their own status
- [ ] Non-admin users cannot access any of these endpoints

---

**End of Implementation Plan**
