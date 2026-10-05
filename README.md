# 🔐 Authentication & Employee Management Platform

A modern, full-stack enterprise web application for secure user authentication, inline OTP verification, and role-based employee management built with **React (TypeScript)**, **Vite**, **Tailwind CSS**, **Node.js**, **Express**, and **MongoDB**.

---

## 🌟 Key Features

### 🔑 Authentication & Security
- **Secure Dual-Token Authentication**: Utilizes short-lived **JWT Access Tokens** (15 min) and long-lived **Refresh Tokens** (7 days) stored securely in `HttpOnly`, `SameSite=Lax` cookies.
- **Client & Server Password Encryption**: 
  - Passwords are encrypted on the client side using **AES (CryptoJS)** before transmission over HTTP.
  - Hashed on the backend using **Bcrypt (cost factor 10)** before saving to MongoDB.
- **User Enumeration Defense**: Unified generic error messages (`"Invalid email or password"`) obscure whether an email is registered.
- **XSS & CSRF Protection**: `HttpOnly` cookies prevent JavaScript token theft via `document.cookie`.

### 📩 Inline Dual OTP Verification
- **Real-Time Email & Phone OTP**: Requires inline OTP verification for both **Email** and **Phone Number** during registration before submission.
- **Persistent Timer State**: Utilizes a custom `usePersistentTimer` hook and `sessionStorage` to preserve exact timer timestamps and OTP input fields across page reloads and browser back-button navigation.

### 🛡️ Password Validation & Strength Meter
- **5-Point Complexity Enforcement**: Enforces minimum 8 characters, at least 1 uppercase letter (`A-Z`), 1 lowercase letter (`a-z`), 1 number (`0-9`), and 1 special character (`@, #, $, %, !, &, *`).
- **Interactive Strength Meter**: Displays an animated 4-tier visual progress bar (Red ➔ Orange ➔ Yellow ➔ Green) as validation criteria are met.
- **Unified Validation**: Identical validation rules applied across both Registration and Forgot/Reset Password flows.

### 🔄 Forgot & Reset Password Flow
- **3-Step Recovery**: Step 1 (Email Input) ➔ Step 2 (OTP Verification) ➔ Step 3 (New Password Setup).
- **Attempt Lockout**: Automatically blocks email requests after 3 failed OTP attempts for a 10-minute cooldown period to prevent brute-force attacks.

### 👥 Admin & Employee Management
- **Admin User Creation**: Admins can invite employees with temporary credentials sent via **Nodemailer**.
- **Complete Profile Flow**: First-time login for admin-created employees automatically redirects to `/complete-profile` until phone verification and profile setup are finished.
- **Role-Based Access Control (RBAC)**: Distinguishes between `Admin` and `Employee` roles for accessing restricted management features.
- **User Blocking/Unblocking**: Admins can instantly block or unblock user accounts.

### 📖 API Documentation
- **Swagger UI Integration**: Interactive API documentation automatically served at `/api-docs`.

---

## 🛠️ Technology Stack

### **Frontend**
- **Framework**: React 18, Vite, TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS, Lucide React Icons
- **HTTP Client**: Axios (with credential cookies enabled)
- **Utilities**: CryptoJS (AES Encryption), `libphonenumber-js`

### **Backend**
- **Runtime & Framework**: Node.js, Express.js
- **Database & ORM**: MongoDB, Mongoose
- **Authentication**: JSON Web Tokens (`jsonwebtoken`), `cookie-parser`
- **Security & Cryptography**: `bcrypt`, CryptoJS
- **Mailing**: Nodemailer (Gmail SMTP)
- **API Docs**: Swagger UI Express (`swagger-ui-express`, `swagger-jsdoc`)

---

## 📂 Project Structure

```text
├── backend/
│   ├── config/             # DB & Swagger configurations
│   ├── controllers/        # Request handlers (authController, userController, taskController)
│   ├── middleware/         # Auth protection middleware (protect, adminOnly)
│   ├── models/             # Mongoose schemas (User, OTP, Task)
│   ├── routes/             # API routes (authRoutes, userRoutes, taskRoutes)
│   ├── utils/              # Helper utilities (phoneValidation, otpLockout)
│   └── server.js           # Express app entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Shared UI components (DatePicker, Layout)
│   │   ├── context/        # React Auth Context & Provider
│   │   ├── features/       # Feature modules
│   │   │   ├── auth/       # Login, Register, ForgotPassword pages
│   │   │   └── employees/  # UserList & Employee Management pages
│   │   ├── hooks/          # Custom hooks (usePersistentTimer)
│   │   ├── utils/          # Validation, Crypto, & API Axios instance
│   │   ├── App.tsx         # Main router setup
│   │   └── main.tsx        # React root entry point
│   └── vite.config.ts      # Vite build configuration
│
└── README.md
```

---

## 🚀 Getting Started

### **Prerequisites**
- **Node.js** (v18.x or higher)
- **npm** or **yarn**
- **MongoDB** (Local instance or MongoDB Atlas cluster)

---

### 1. **Backend Setup**

Navigate to the `backend` directory:
```bash
cd backend
```

Install dependencies:
```bash
npm install
```

Create a `.env` file in the `backend` directory with the following variables:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/registration_db
JWT_SECRET=your_super_secret_jwt_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

Start the backend server:
```bash
npm start
```
> The backend server will start on `http://localhost:5000`.  
> Swagger documentation will be available at `http://localhost:5000/api-docs`.

---

### 2. **Frontend Setup**

Navigate to the `frontend` directory:
```bash
cd ../frontend
```

Install dependencies:
```bash
npm install
```

Create a `.env` file in the `frontend` directory:
```env
VITE_API_URL=http://localhost:5000/api
```

Start the development server:
```bash
npm run dev
```
> The frontend application will run on `http://localhost:5173`.

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/send-verification-otp` | Send Email/Phone OTP for inline verification | Public |
| `POST` | `/api/auth/verify-inline-otp` | Verify inline OTP during registration | Public |
| `POST` | `/api/users/register` | Register a new user account | Public |
| `POST` | `/api/users/login` | Authenticate user & issue HttpOnly token cookies | Public |
| `POST` | `/api/auth/forgot-password` | Request password reset OTP | Public |
| `POST` | `/api/auth/reset-password` | Reset password using verified OTP | Public |
| `POST` | `/api/auth/admin-create-user` | Admin endpoint to create employee account | Protected (Admin) |
| `GET` | `/api/users/employees` | Fetch list of registered employees | Protected (Admin) |
| `PUT` | `/api/users/:id/block` | Toggle block/unblock status for a user | Protected (Admin) |
| `POST` | `/api/users/logout` | Clear token cookies and destroy session | Protected |

---

## 🛡️ Security Mechanisms Explained

### 1. **MongoDB Sparse Indexing**
To support admin-created users who don't initially have a phone number, the `phoneNumber` schema field uses `{ unique: true, sparse: true }`. In `User.js`, empty phone values are converted to `undefined` before saving, preventing MongoDB from throwing duplicate key errors (`E11000`) on missing values.

### 2. **Index Synchronization (`User.syncIndexes()`)**
On server startup, `User.syncIndexes()` is invoked to compare database indexes against the Mongoose schema, automatically dropping legacy non-sparse indexes and rebuilding valid sparse unique indexes.

### 3. **Persistent Timer Logic (`usePersistentTimer.ts`)**
Instead of counting down using volatile component state that resets on reload, the timer stores the absolute target timestamp (`Date.now() + duration`) in `sessionStorage`. On remount or refresh, it calculates the remaining time (`targetTimestamp - Date.now()`), guaranteeing uninterrupted timer continuity.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
