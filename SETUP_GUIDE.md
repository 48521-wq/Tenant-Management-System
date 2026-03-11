# TMS — Tenant Management System
## Complete Setup Guide with MongoDB Atlas + Google OAuth

---

## STEP 1 — MongoDB Atlas Setup

Your cluster is already created at:
https://cloud.mongodb.com/v2/69ae193f4d952409afb01fa3#/explorer/69ae1b6bad1d1a1fb10f3bf0/tms_database

### Get your connection string:
1. Go to: https://cloud.mongodb.com
2. Click your cluster → "Connect"
3. Choose "Connect your application"
4. Driver: Node.js, Version: 5.5 or later
5. Copy the connection string — looks like:
   mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/

### Whitelist your IP:
1. In Atlas → Network Access → Add IP Address
2. Click "Allow Access from Anywhere" (0.0.0.0/0) for development

---

## STEP 2 — Google OAuth Client ID Setup

1. Go to: https://console.cloud.google.com
2. Create a New Project (or select existing)
3. Go to: APIs & Services → Credentials
4. Click: "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: Web application
6. Add Authorized JavaScript origins:
   - http://localhost:5500
   - http://127.0.0.1:5500
   - http://localhost:3000
7. Click Create → Copy your Client ID
   Format: XXXXX.apps.googleusercontent.com

---

## STEP 3 — Configure .env file

Open: backend/.env and fill in your values:

```
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/tms_database?retryWrites=true&w=majority
JWT_SECRET=any_long_random_secret_string_here
ADMIN_EMAIL=adboy768@gmail.com
ADMIN_PASSWORD=adnan123@
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
PORT=5000
```

---

## STEP 4 — Configure Frontend

Open: js/app.js (line 8)
Change:
```
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
```
To your actual Google Client ID.

---

## STEP 5 — Install & Run Backend

Open terminal in the TenantManagementSystem folder:

```bash
# Go to backend folder
cd backend

# Install dependencies
npm install

# Start server
npm start

# Or for development with auto-reload:
npm run dev  (requires: npm install -g nodemon)
```

You should see:
```
🚀 TMS Backend running on http://localhost:5000
✅ MongoDB Atlas Connected: your-cluster.mongodb.net
📦 Database: tms_database
```

---

## STEP 6 — Run Frontend

**Option A — VS Code Live Server:**
- Install "Live Server" extension in VS Code
- Right-click index.html → "Open with Live Server"
- Opens at: http://127.0.0.1:5500

**Option B — Simple HTTP Server:**
```bash
# In TenantManagementSystem folder (NOT backend)
npx serve .
# or
python -m http.server 3000
```

---

## How It Works Now

### Email Sign Up:
1. User fills form → clicks Create Account
2. Frontend sends POST to http://localhost:5000/api/auth/register
3. Backend hashes password with bcrypt
4. Saves to MongoDB Atlas → tms_database → users collection
5. Returns JWT token
6. Frontend saves token to localStorage
7. Redirects to correct dashboard

### Email Sign In:
1. User enters email + password
2. Frontend sends POST to http://localhost:5000/api/auth/login
3. Backend finds user in MongoDB
4. Compares hashed password with bcrypt
5. Returns JWT token if correct
6. Frontend saves token and redirects

### Google Sign In (Real):
1. User clicks "Sign in with Google"
2. Google popup shows — user picks their account
3. Google returns a JWT credential token
4. Frontend sends credential to POST /api/auth/google
5. Backend verifies token with Google servers
6. Finds/creates user in MongoDB
7. Returns our own JWT token
8. Frontend redirects

### Admin Login:
- Admin credentials checked against .env (NOT stored in MongoDB)
- Email: adboy768@gmail.com / Password: adnan123@

---

## MongoDB Collections Created Automatically:

- **tms_database.users** — All registered users
  Fields: name, email, password(hashed), role, authProvider, googleId,
          status, verified, phone, cnic, city, address, createdAt, updatedAt

---

## API Endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Email Sign Up |
| POST | /api/auth/login | Email Sign In |
| POST | /api/auth/google | Google OAuth Sign In/Up |
| GET | /api/auth/me | Get current user |
| GET | /api/users | Get all users (Admin only) |
| PUT | /api/users/:id/block | Block/Unblock user (Admin) |
| PUT | /api/users/:id/verify | Verify user (Admin) |
| DELETE | /api/users/:id | Delete user (Admin) |
| GET | /api/health | Server health check |

---

## Troubleshooting:

**"Cannot connect to server"** → Backend not running. Run `npm start` in backend folder.

**MongoDB connection error** → Check MONGODB_URI in .env. Make sure IP is whitelisted in Atlas.

**Google OAuth not working** → Make sure GOOGLE_CLIENT_ID is set in both .env and js/app.js.

**CORS error** → Make sure frontend URL matches FRONTEND_URL in .env.

---

## Folder Structure:

```
TenantManagementSystem/
├── index.html              ← Main login/signup page
├── css/style.css
├── js/
│   ├── app.js              ← Auth logic (MongoDB API calls)
│   └── house3d.js
├── pages/
│   ├── admin-dashboard.html
│   ├── landlord-dashboard.html
│   └── tenant-dashboard.html
└── backend/                ← Node.js + Express server
    ├── server.js           ← Main server file
    ├── .env                ← YOUR CREDENTIALS (never commit this!)
    ├── package.json
    ├── config/
    │   └── database.js     ← MongoDB Atlas connection
    ├── models/
    │   └── User.js         ← MongoDB User schema
    ├── routes/
    │   ├── auth.js         ← Login/Register/Google endpoints
    │   └── users.js        ← User management endpoints
    └── middleware/
        └── auth.js         ← JWT verification middleware
```
