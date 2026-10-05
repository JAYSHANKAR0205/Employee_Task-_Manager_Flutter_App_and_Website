# 🏢 Employee Task & Leave Manager — Full-Stack Platform (Web & Mobile)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![Flutter](https://img.shields.io/badge/Flutter-3.x-02569B.svg)](https://flutter.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC.svg)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%2F%20Local-47A248.svg)](https://www.mongodb.com/)

A comprehensive, production-ready enterprise solution for **Employee Management**, **Task Tracking with Multi-File Attachments**, and **Leave Management with Multi-tier Approvals**. The ecosystem includes an **Express/MongoDB REST API**, a modern **React + Vite + TypeScript web application**, and a high-performance **Flutter mobile application (Android & iOS)** with offline-ready local storage and Riverpod state management.

---

## 📑 Table of Contents

- [Architecture & Monorepo Structure](#-architecture--monorepo-structure)
- [🌟 Key Modules & Features](#-key-modules--features)
- [🛠️ Technology Stack](#️-technology-stack)
- [🚀 Quick Start & Installation](#-quick-start--installation)
  - [1. Backend API Setup](#1-backend-api-setup)
  - [2. Frontend Web Application Setup](#2-frontend-web-application-setup)
  - [3. Flutter Mobile Application Setup](#3-flutter-mobile-application-setup)
- [📡 API Documentation & Endpoints](#-api-documentation--endpoints)
- [🔐 Security & Data Protection](#-security--data-protection)
- [📜 License](#-license)

---

## 📂 Architecture & Monorepo Structure

```text
Organisation_Task Manager/
│
├── backend/                             # Express REST API & Database
│   ├── config/                          # MongoDB connection & Swagger OpenAPI specification
│   ├── controllers/                     # Controller handlers (auth, user, task, leave)
│   ├── middleware/                      # Auth guards, role checks & file upload middleware
│   ├── models/                          # Mongoose schemas (User, Task, LeaveRequest, LeaveType, OTP)
│   ├── routes/                          # API route definitions
│   ├── scripts/                         # Database seeds (createAdmin.js, setRole.js)
│   ├── services/                        # Notification services (Nodemailer email dispatcher)
│   ├── utils/                           # Cloudinary client, crypto utilities, phone validators
│   ├── .env.example                     # Environment template for backend configurations
│   ├── .gitignore                       # Backend Git ignore rules (protects .env & secrets)
│   ├── package.json                     # Node.js dependencies and scripts
│   └── server.js                        # Primary backend entry point & server bootstrap
│
├── frontend/                            # React 18 + Vite Web Application
│   ├── src/
│   │   ├── components/                  # Shared UI widgets (Modals, Dropdowns, DatePicker)
│   │   ├── context/                     # Global AuthContext & theme state providers
│   │   ├── features/                    # Domain feature modules:
│   │   │   ├── auth/                    # Login, Register, Forgot Password & OTP flows
│   │   │   ├── dashboard/               # Metric overview, active tasks & balance widgets
│   │   │   ├── employees/               # Employee directory & user status management
│   │   │   ├── leaves/                  # Leave applications, history & admin approval queues
│   │   │   └── tasks/                   # Kanban/List task board with multi-attachment uploads
│   │   ├── hooks/                       # Custom hooks (e.g., usePersistentTimer for OTP resilience)
│   │   ├── services/                    # Axios API client with interceptors
│   │   ├── utils/                       # Payload crypto, formatters & validation rules
│   │   ├── App.tsx                      # Application routing & protected route wrappers
│   │   └── main.tsx                     # React virtual DOM bootstrap
│   ├── .env.example                     # Frontend environment template
│   ├── .gitignore                       # Frontend Git ignore rules
│   ├── package.json                     # Frontend dependencies
│   ├── tailwind.config.js               # Tailwind design system configuration
│   └── vite.config.ts                   # Vite bundler & build settings
│
├── mobiloi_flutter_app/                 # Cross-Platform Flutter Mobile Application
│   ├── android/                         # Android native project configurations
│   ├── ios/                             # iOS native Xcode workspace
│   ├── lib/
│   │   ├── core/                        # Core app constants, networking & local storage
│   │   │   ├── constants/               # API endpoints & asset configurations (api_constants.dart)
│   │   │   ├── network/                 # Dio HTTP client, token interceptors & error handlers
│   │   │   └── storage/                 # SharedPreferences session & token caching
│   │   ├── data/
│   │   │   ├── models/                  # Dart models (UserModel, TaskModel, LeaveModel)
│   │   │   └── repositories/            # Data layer repositories (Auth, Task, Leave)
│   │   ├── presentation/
│   │   │   ├── providers/               # Riverpod StateNotifiers (Auth, Tasks, Leaves, Theme)
│   │   │   ├── screens/
│   │   │   │   ├── auth/                # Mobile Login, Register, Forgot Password
│   │   │   │   ├── dashboard/           # Mobile Dashboard with quick action cards
│   │   │   │   ├── employees/           # Searchable Employee list
│   │   │   │   ├── leaves/              # Leave application & Admin approval tabs
│   │   │   │   ├── profile/             # Profile details, photo update & security settings
│   │   │   │   ├── settings/            # App preferences & theme toggles
│   │   │   │   └── tasks/               # Mobile Task board & status management
│   │   │   └── widgets/                 # Reusable components (Drawer, Badges, Pickers)
│   │   └── main.dart                    # Flutter entry point & ProviderScope root
│   ├── pubspec.yaml                     # Flutter package dependencies
│   └── .gitignore                       # Flutter-specific ignore rules (protects key.properties, keystores)
│
├── .gitignore                           # Root-level Git security rules
└── README.md                            # Comprehensive project documentation
```

---

## 🌟 Key Modules & Features

### 1. 🔐 Authentication & Session Security
- **Dual-Token System**: Employs short-lived JWT Access Tokens (15 min) and long-lived Refresh Tokens (7 days) via secure `HttpOnly`, `SameSite=Lax` cookies for Web and persistent encrypted storage for Flutter.
- **Client & Server Cryptography**: Passwords can be client-side encrypted before transmission and hashed on the backend using **Bcrypt (cost factor 10)**.
- **Dual Inline OTP Verification**: Real-time OTP dispatch and verification for both **Email** (via Nodemailer) and **Phone Number** (via Twilio/Dev mode).
- **Resilient Timers (`usePersistentTimer`)**: Countdown timers calculate time from absolute epoch timestamps stored in `sessionStorage`, persisting accurately across page refreshes and navigation.
- **Account Protection**: Automatic account lockout after 3 consecutive failed OTP attempts for 10 minutes.

### 2. 📋 Task Management & Multi-Attachment Engine
- **Task Lifecycle**: Full lifecycle tracking (`Pending`, `In Progress`, `Completed`, `Blocked`).
- **Priority & Due Dates**: Low, Medium, High, and Urgent priority tags with date filters.
- **Multi-File Cloud Attachments**:
  - Integrated with **Cloudinary** for image and document uploads (`.pdf`, `.docx`, `.xlsx`, `.png`, `.jpg`).
  - Batch archive download: Generates zip files on-the-fly for downloading all task attachments at once.
- **Role Scoping**: Employees view and update assigned tasks; Admins create, assign, update, and manage all organization tasks.

### 3. 🏖️ Leave Management & Approval Queues
- **Leave Types**: Supports Casual Leave, Paid Leave, and Emergency Leave (auto-seeded on server startup).
- **Balance Tracking**: Real-time balance deductions upon admin approval, with balance validation prior to submission.
- **Workflow Automation**:
  - Employees submit requests with reason and dates.
  - Admins inspect pending requests, review justifications, and approve or reject with comments.
  - Instant notification dispatch on status change.

### 4. 👥 Employee Directory & Administration
- **Admin-Invited Accounts**: Administrators can invite employees with generated credentials sent via email.
- **Profile Completion Flow**: First-time login prompts employees to complete profile verification and upload profile pictures.
- **Account Control**: Instant block/unblock toggles for employee access.

### 5. 📱 Flutter Cross-Platform Mobile Experience
- Built using **Flutter 3.x** and **Riverpod** for reactive state updates.
- Native mobile features: Camera/Gallery profile picture selection, file picker for attachments, and responsive layouts.
- Dynamic environment switching using `--dart-define=API_BASE_URL=...` for development emulators, physical devices, and production servers.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend API** | Node.js (v18+), Express.js, MongoDB, Mongoose, JWT, Nodemailer, Cloudinary, Twilio, Swagger UI Express |
| **Frontend Web** | React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Axios, CryptoJS, `libphonenumber-js` |
| **Mobile App** | Flutter 3.x, Dart 3.x, Riverpod (`flutter_riverpod`), Dio, GoRouter, Google Fonts, SharedPreferences, FilePicker |
| **DevOps & Security** | Git, Environment Variable isolation (`.env.example`), Bcrypt, Sparse Indexing |

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Node.js** (v18.x or later) & **npm**
- **MongoDB** (Local instance or MongoDB Atlas cluster URI)
- **Flutter SDK** (v3.13.x or later) & **Android Studio / Xcode** (for mobile development)

---

### 1. Backend API Setup

1. Open your terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Copy `.env.example` to create your local `.env` file:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your credentials:
   ```env
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   MONGODB_URI=mongodb://localhost:27017/registration_db

   JWT_SECRET=your_super_strong_jwt_secret_min_32_chars
   REFRESH_TOKEN_SECRET=your_super_strong_refresh_secret
   ENCRYPTION_SECRET=your_payload_encryption_key

   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_gmail_app_password

   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

4. *(Optional)* Seed an Admin Account:
   ```bash
   node scripts/createAdmin.js admin@example.com StrongPassword123! "Super" "Admin"
   ```

5. Start the server:
   ```bash
   npm start
   ```
   - **Backend API**: `http://localhost:5000`
   - **Interactive Swagger Documentation**: `http://localhost:5000/api-docs`

---

### 2. Frontend Web Application Setup

1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Copy `.env.example` to create your local `.env`:
   ```bash
   cp .env.example .env
   ```
   Ensure the API endpoint is configured:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_ENCRYPTION_SECRET=your_payload_encryption_key
   ```

4. Start Vite development server:
   ```bash
   npm run dev
   ```
   - Access the web interface at `http://localhost:5173`.

---

### 3. Flutter Mobile Application Setup

1. Navigate to the `mobiloi_flutter_app` folder:
   ```bash
   cd mobiloi_flutter_app
   ```

2. Fetch Flutter packages:
   ```bash
   flutter pub get
   ```

3. Run the app:
   - **Android Emulator** (Android uses `10.0.2.2` to refer to host localhost):
     ```bash
     flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api
     ```
   - **Physical Device** (Replace with your local Wi-Fi IP address):
     ```bash
     flutter run --dart-define=API_BASE_URL=http://192.168.1.100:5000/api
     ```
   - **Windows / macOS Desktop / Web**:
     ```bash
     flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:5000/api
     ```

---

## 📡 API Documentation & Endpoints

Explore the full interactive documentation at `http://localhost:5000/api-docs`.

### Authentication & Users
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/send-verification-otp` | Send Email or Phone OTP for verification | Public |
| `POST` | `/api/auth/verify-inline-otp` | Validate inline registration OTP | Public |
| `POST` | `/api/users/register` | Register a new Employee/User account | Public |
| `POST` | `/api/users/login` | Authenticate and issue token credentials | Public |
| `POST` | `/api/users/logout` | Invalidate tokens and terminate session | Authenticated |
| `GET` | `/api/users/me` | Fetch authenticated user's profile | Authenticated |
| `POST` | `/api/auth/admin-create-user` | Admin endpoint to invite employee | Admin Only |
| `GET` | `/api/users/employees` | List all registered organization employees | Admin Only |
| `PUT` | `/api/users/:id/block` | Toggle active/blocked status of an employee | Admin Only |

### Task Management
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tasks` | Fetch tasks (filtered by user role or query) | Authenticated |
| `POST` | `/api/tasks` | Create new task with file attachments | Admin Only |
| `PUT` | `/api/tasks/:id` | Update task details or reassignment | Admin / Assignee |
| `PATCH` | `/api/tasks/:id/status` | Update task status (`Pending` ➔ `Completed`) | Assignee / Admin |
| `DELETE` | `/api/tasks/:id` | Remove task | Admin Only |
| `GET` | `/api/tasks/:id/download-zip` | Download all task attachments as a ZIP | Authenticated |

### Leave Management
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/leaves/balance` | Get employee leave balance summary | Employee |
| `GET` | `/api/leaves/my-requests` | View leave requests submitted by employee | Employee |
| `POST` | `/api/leaves/apply` | Submit new leave application | Employee |
| `PATCH` | `/api/leaves/:id/cancel` | Cancel a pending leave request | Employee |
| `GET` | `/api/admin/leaves` | List all organization leave requests | Admin Only |
| `PATCH` | `/api/admin/leaves/:id/approve` | Approve leave application and deduct quota | Admin Only |
| `PATCH` | `/api/admin/leaves/:id/reject` | Reject leave request with justification | Admin Only |
| `GET` | `/api/admin/leave-types` | View and manage organizational leave types | Admin Only |

---

## 🔐 Security & Data Protection

1. **Repository Secret Hygiene**:
   - All `.env`, `.env.*`, and `*.local` files are strictly ignored across the root, backend, frontend, and Flutter repositories.
   - Mobile signing keys (`key.properties`, `*.jks`, `*.keystore`) and Firebase service files are excluded from version control.
2. **MongoDB Sparse Indexing**:
   - `phoneNumber` fields utilize sparse indexing (`{ unique: true, sparse: true }`), preventing duplicate key errors when admin-invited employees have not yet linked a phone number.
3. **Index Self-Healing (`User.syncIndexes()`)**:
   - Automatic index synchronization runs at backend startup to align indexes with Mongoose models, dropping legacy conflicts automatically.
4. **XSS & CSRF Mitigation**:
   - Web authentication cookies use `HttpOnly`, `SameSite=Lax`, and `Secure` flags in production to prevent cookie tampering and cross-site scripting vulnerabilities.

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for further details.
