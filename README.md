# 🏠 Tenant Management System

A modern, full-stack property management platform designed for landlords and tenants to manage properties, leases, payments, maintenance requests, and complaints efficiently.

---

## 📋 Features

✨ **Core Features:**
- 🔐 JWT-based Authentication with Google OAuth
- 👥 Role-based Access Control (Admin, Landlord, Tenant)
- 🏢 Property Management
- 📝 Lease Agreement Management
- 💰 Payment Tracking & History
- 🛠️ Maintenance Request System
- 📞 Complaint Management
- 📱 Fully Responsive Design
- 🌙 Dark/Light Theme Support

---

## 🏗️ Project Architecture

```
TMS_fixed/
├── backend/
│   ├── config/
│   │   └── database.js          # MongoDB Atlas Connection
│   ├── middleware/
│   │   └── auth.js              # JWT Authentication & Authorization
│   ├── models/
│   │   ├── User.js
│   │   ├── Property.js
│   │   ├── Lease.js
│   │   ├── Payment.js
│   │   ├── Maintenance.js
│   │   └── Complaint.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── properties.js
│   │   ├── leases.js
│   │   ├── payments.js
│   │   ├── maintenance.js
│   │   └── complaints.js
│   ├── server.js                # Express Server Entry Point
│   └── package.json
│
├── frontend/
│   ├── index.html               # Authentication Page
│   ├── pages/
│   │   ├── admin-dashboard.html
│   │   ├── landlord-dashboard.html
│   │   └── tenant-dashboard.html
│   ├── js/
│   │   ├── app.js              # Main Application Logic
│   │   ├── house3d.js
│   │   ├── furniture3d.js
│   │   └── tms-data.js
│   ├── css/
│   │   └── style.css           # Global Styling
│   └── assets/
│
└── Documentation/
    ├── START_SERVER.bat        # Windows Server Launcher
    ├── HOW_TO_RUN.txt
    └── README.md               # This File
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+)
- MongoDB Atlas Account
- Git

### Installation

1. **Clone the Repository**
```bash
git clone https://github.com/48521-wq/Tenant-Management-System.git
cd Tenant-Management-System
```

2. **Install Backend Dependencies**
```bash
cd backend
npm install
```

3. **Configure Environment Variables**
Create a `.env` file in the backend directory:
```env
MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=your_jwt_secret_key
PORT=5000
ADMIN_EMAIL=admin@example.com
```

4. **Start the Backend Server**
```bash
npm start
# or
node server.js
```

Backend will run on: `http://localhost:5000`

5. **Launch the Frontend**
Open `index.html` in your browser or use a local web server:
```bash
# Using Python
python -m http.server 8000

# Using Node (http-server)
npx http-server
```

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup` - User Registration
- `POST /api/auth/signin` - User Login
- `POST /api/auth/google` - Google OAuth Login
- `POST /api/auth/forgot-password` - Password Reset

### Users
- `GET /api/users/profile` - Get User Profile
- `PUT /api/users/profile` - Update Profile
- `GET /api/users` - List All Users (Admin)

### Properties
- `GET /api/properties` - List Properties
- `POST /api/properties` - Create Property (Landlord)
- `PUT /api/properties/:id` - Update Property
- `DELETE /api/properties/:id` - Delete Property

### Leases
- `POST /api/leases` - Create Lease Agreement
- `GET /api/leases` - Get Leases
- `PUT /api/leases/:id` - Update Lease

### Payments
- `POST /api/payments` - Record Payment
- `GET /api/payments` - Get Payment History
- `GET /api/payments/user/:userId` - User Payments

### Maintenance
- `POST /api/maintenance` - Submit Request
- `GET /api/maintenance` - Get Requests
- `PUT /api/maintenance/:id` - Update Status

### Complaints
- `POST /api/complaints` - File Complaint
- `GET /api/complaints` - Get Complaints
- `PUT /api/complaints/:id` - Update Complaint Status

---

## 🔐 Authentication & Security

- **JWT Tokens** - Secure token-based authentication
- **Password Hashing** - bcrypt for password security
- **Role-Based Access Control** - Admin, Landlord, Tenant roles
- **Google OAuth 2.0** - Third-party authentication
- **CORS Protection** - Cross-origin resource sharing configured
- **Environment Variables** - Sensitive data protection

---

## 🎨 Frontend Technologies

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with gradient and animations
- **Vanilla JavaScript** - No framework dependencies
- **Google Fonts** - Playfair Display & DM Sans
- **3D Visualization** - Three.js for property visualization
- **Local Storage** - Client-side data persistence

---

## ⚙️ Backend Technologies

- **Node.js & Express** - Server framework
- **MongoDB Atlas** - Cloud database
- **Mongoose** - Database ODM
- **JWT** - Token authentication
- **CORS** - Cross-origin requests
- **dotenv** - Environment configuration
- **bcryptjs** - Password hashing

---

## 👥 User Roles

### Admin
- Manage all users
- View system statistics
- Handle complaints & maintenance

### Landlord
- Manage properties
- Create lease agreements
- Track payments
- Handle maintenance requests

### Tenant
- View assigned properties
- Submit complaints
- Track payments
- Request maintenance

---

## 🚨 Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Technical error details"
}
```

Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

---

## 📝 Database Models

### User
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  phone: String,
  role: String (admin, landlord, tenant),
  profilePicture: String,
  status: String (active, blocked),
  createdAt: Date
}
```

### Property
```javascript
{
  title: String,
  address: String,
  landlordId: ObjectId,
  type: String,
  bedrooms: Number,
  bathrooms: Number,
  rentAmount: Number,
  createdAt: Date
}
```

---

## 🐛 Troubleshooting

**MongoDB Connection Error**
- Verify `MONGODB_URI` in `.env`
- Check IP whitelist in MongoDB Atlas
- Ensure internet connection

**JWT Token Error**
- Clear browser localStorage
- Verify `JWT_SECRET` is set
- Re-login to get new token

**CORS Error**
- Check backend CORS configuration
- Verify frontend URL is whitelisted

---

## 📧 Contact & Support

**Author:** Muhammad Shahzaib  
**Email:** 48746@students.riphah.edu.pk  
**GitHub:** https://github.com/48521-wq

---

## 📄 License

This project is for educational purposes. All rights reserved.

---

**Last Updated:** April 2, 2026  
**Version:** 3.0
