# 🏠 Tenant Management System (TMS)

A full-stack web application for managing rental properties, tenants, landlords, complaints, maintenance requests, and lease agreements.

---

## 🚀 Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | HTML5, CSS3, Vanilla JavaScript   |
| Backend   | Node.js, Express.js               |
| Database  | MongoDB Atlas (Mongoose ODM)      |
| Auth      | JWT + Google OAuth 2.0 (GSI)      |

---

## 📁 Project Structure

```
TMS_fixed/
├── index.html                  # Login / signup page
├── pages/
│   ├── admin-dashboard.html    # Admin panel
│   ├── landlord-dashboard.html # Landlord panel
│   └── tenant-dashboard.html   # Tenant panel
├── js/
│   ├── app.js                  # Auth logic (login, signup, Google OAuth)
│   ├── tms-data.js             # LocalStorage data layer + render helpers
│   ├── house3d.js              # 3D house model rendering
│   └── furniture3d.js          # 3D furniture placement
├── css/
│   └── style.css               # Global styles
└── backend/
    ├── server.js               # Express server entry point
    ├── config/
    │   └── database.js         # MongoDB Atlas connection
    ├── middleware/
    │   └── auth.js             # JWT verify + role guard
    ├── models/
    │   ├── User.js
    │   ├── Property.js
    │   ├── Complaint.js
    │   ├── Maintenance.js
    │   ├── Payment.js
    │   └── Lease.js
    └── routes/
        ├── auth.js             # /api/auth — register, login, Google OAuth
        ├── users.js            # /api/users — admin user management
        ├── properties.js       # /api/properties — CRUD + 3D config
        ├── complaints.js       # /api/complaints
        ├── maintenance.js      # /api/maintenance
        ├── payments.js         # /api/payments
        └── leases.js           # /api/leases
```

---

## ⚙️ Setup & Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/TenantManagementSystem.git
cd TenantManagementSystem/TMS_fixed
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure environment variables

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/tms
JWT_SECRET=your_jwt_secret_here
ADMIN_EMAIL=admin@tms.com
ADMIN_PASSWORD=admin123
GOOGLE_CLIENT_ID=your_google_client_id
```

### 4. Start the backend server

```bash
npm start
```

Server runs at: `http://localhost:5000`

### 5. Open the frontend

Open `index.html` in your browser (or serve with Live Server).

---

## 👥 User Roles

| Role     | Permissions                                              |
|----------|----------------------------------------------------------|
| Admin    | Full access — manage all users, properties, complaints   |
| Landlord | List properties, view tenants, view complaints           |
| Tenant   | View properties, file complaints, submit maintenance     |

---

## 🔐 API Endpoints

| Method | Endpoint                        | Description                  |
|--------|---------------------------------|------------------------------|
| POST   | `/api/auth/register`            | Register new user            |
| POST   | `/api/auth/login`               | Login with email + password  |
| POST   | `/api/auth/google`              | Google OAuth login/signup    |
| GET    | `/api/auth/me`                  | Get current user profile     |
| PUT    | `/api/auth/profile`             | Update profile               |
| GET    | `/api/properties`               | List all properties          |
| POST   | `/api/properties`               | Create property (landlord)   |
| PUT    | `/api/properties/:id`           | Update property              |
| DELETE | `/api/properties/:id`           | Delete property              |
| GET    | `/api/complaints`               | List complaints (scoped)     |
| POST   | `/api/complaints`               | File complaint (tenant)      |
| GET    | `/api/maintenance`              | List maintenance (scoped)    |
| POST   | `/api/maintenance`              | Submit request (tenant)      |
| GET    | `/api/payments`                 | List payments (scoped)       |
| POST   | `/api/payments`                 | Record payment (tenant)      |
| GET    | `/api/leases`                   | List leases (scoped)         |
| POST   | `/api/leases`                   | Sign lease (tenant)          |

---

## 🌟 Features

- **Role-based dashboards** — separate views for admin, landlord, and tenant
- **Google OAuth** — real GSI integration with fallback for dev mode
- **3D Property Viewer** — interactive 3D house and furniture placement
- **Complaint & Maintenance tracking** — status updates with admin notes
- **JWT authentication** — secure token-based sessions (7-day expiry)
- **LocalStorage data layer** — works offline; API-ready for MongoDB switch

---

## 📄 License

MIT License — free to use and modify.
