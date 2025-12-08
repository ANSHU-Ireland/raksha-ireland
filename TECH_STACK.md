# Raksha Ireland - Complete Technology Stack

## Project Overview
**Raksha Ireland** is an emergency alert system designed for immigrants and residents in Ireland. It provides real-time SOS alerts, location tracking, admin user management, and community emergency response features.

---

## 🎯 Core Technologies

### **Runtime Environments**
- **Node.js**: v22.11.0 (Backend runtime)
- **npm**: v10.9.0 (Package manager)
- **Dart**: 3.10.1 (Flutter language)
- **Flutter**: 3.38.3 (Mobile framework)

---

## 📱 Mobile Application (Flutter)

### **Framework & Language**
- **Flutter**: 3.38.3 (stable channel)
- **Dart SDK**: 3.10.1
- **DevTools**: 2.51.1
- **Target Platforms**: Web (Chrome), Android, iOS
- **Minimum SDK**: Dart >=3.0.0 <4.0.0

### **State Management**
- **Provider**: ^6.1.1 - Application state management pattern

### **Authentication & Security**
- **Firebase Auth**: ^6.1.2 - User authentication (Email/Password, Google Sign-In)
- **Firebase Core**: ^4.2.1 - Firebase initialization
- **Flutter Secure Storage**: ^9.0.0 - Secure local storage for tokens

### **HTTP & Networking**
- **Dio**: ^5.3.2 - HTTP client for API calls
- **HTTP**: ^1.1.0 - Standard HTTP package
- **Retrofit**: ^4.0.3 - Type-safe HTTP client
- **Connectivity Plus**: ^7.0.0 - Network connectivity monitoring
- **JSON Annotation**: ^4.8.1 - JSON serialization support

### **Location & Maps**
- **Geolocator**: ^14.0.2 - GPS location services
- **Geocoding**: ^4.0.0 - Address ↔ Coordinates conversion
- **Google Maps Flutter**: ^2.5.0 - Interactive maps

### **Push Notifications**
- **Firebase Messaging**: ^16.0.4 - Cloud messaging
- **Flutter Local Notifications**: ^19.5.0 - Local notification support

### **Storage & Persistence**
- **Shared Preferences**: ^2.2.2 - Key-value storage
- **Flutter Secure Storage**: ^9.0.0 - Encrypted storage

### **UI Components & Enhancement**
- **Cupertino Icons**: ^1.0.6 - iOS-style icons
- **Flutter SVG**: ^2.0.8 - SVG rendering
- **Cached Network Image**: ^3.3.0 - Image caching
- **Shimmer**: ^3.0.0 - Loading skeleton screens
- **Lottie**: ^3.3.2 - Animation support

### **Utilities**
- **Intl**: ^0.20.2 - Internationalization
- **UUID**: ^4.1.0 - Unique ID generation
- **Permission Handler**: ^12.0.1 - Runtime permissions
- **Home Widget**: ^0.8.1 - Widget extensions

### **Development Tools**
- **Build Runner**: ^2.10.4 - Code generation
- **Retrofit Generator**: ^10.2.0 - API client generation
- **JSON Serializable**: ^6.11.3 - JSON serialization generation
- **Flutter Lints**: ^6.0.0 - Code analysis
- **Mockito**: ^5.6.1 - Testing mocks

---

## 🖥️ Backend Server (Node.js)

### **Framework & Runtime**
- **Express**: ^4.18.2 - Web framework
- **Node.js**: >=18.0.0 (Currently running v22.11.0)
- **npm**: >=8.0.0 (Currently running v10.9.0)

### **Database & ORM**
- **PostgreSQL**: 17.0 (Database)
- **Knex.js**: ^2.5.1 - SQL query builder & migrations
- **pg**: ^8.11.3 - PostgreSQL client

### **Authentication & Security**
- **Firebase Admin**: ^11.10.1 - Server-side Firebase SDK
- **JWT (jsonwebtoken)**: ^9.0.2 - Token generation & verification
- **bcrypt**: ^5.1.1 - Password hashing
- **Helmet**: ^7.0.0 - HTTP security headers
- **Express Rate Limit**: ^6.10.0 - API rate limiting
- **CORS**: ^2.8.5 - Cross-origin resource sharing

### **Validation & Utilities**
- **Joi**: ^17.9.2 - Schema validation
- **Express Validator**: ^7.3.1 - Request validation
- **UUID**: ^9.0.0 - Unique ID generation
- **Moment**: ^2.29.4 - Date manipulation
- **dotenv**: ^16.3.1 - Environment variables

### **HTTP & Optimization**
- **Axios**: ^1.5.0 - HTTP client
- **Compression**: ^1.7.4 - Response compression
- **Morgan**: ^1.10.0 - HTTP request logger

### **Development Tools**
- **Nodemon**: ^3.0.1 - Auto-restart on file changes
- **ESLint**: ^8.47.0 - Code linting
- **ESLint Config Airbnb**: ^15.0.0 - Airbnb style guide
- **Jest**: ^29.6.4 - Testing framework
- **Supertest**: ^6.3.3 - HTTP assertion library
- **Husky**: ^8.0.3 - Git hooks
- **Lint-staged**: ^14.0.1 - Pre-commit linting

---

## ☁️ Cloud Services & Infrastructure

### **Firebase Services**
- **Firebase Authentication**
  - Email/Password authentication
  - Google Sign-In provider
  - Custom token generation
  - User management
  
- **Firebase Cloud Messaging (FCM)**
  - Push notifications
  - Background message handling
  - Notification channels

- **Firebase Admin SDK**
  - Server-side authentication verification
  - User profile management
  - Custom claims

### **Database**
- **Supabase PostgreSQL**
  - Host: `db.mcyruxndjbxpvcjqdgyx.supabase.co`
  - Port: 5432
  - Database: postgres
  - Connection pooling
  - SSL encryption

### **Hosting & Deployment**
- **Backend**: Node.js server (Development: localhost:3000)
- **Admin Panel**: Embedded HTML (served by Express)
- **Mobile App**: Flutter Web (Chrome), Android APK, iOS IPA

---

## 🗄️ Database Schema

### **Users Table**
```sql
- id (UUID, Primary Key)
- email (VARCHAR(255), Unique)
- password_hash (VARCHAR(255), Nullable for Firebase users)
- full_name (VARCHAR(255))
- nationality (VARCHAR(255), Nullable)
- phone_number (VARCHAR(255), Nullable)
- verification_status (TEXT: pending/verified/rejected)
- verification_notes (TEXT)
- verified_at (TIMESTAMP)
- role (TEXT: user/admin)
- status (TEXT: active/disabled/deleted)
- location_enabled (BOOLEAN)
- last_latitude (NUMERIC(10,8))
- last_longitude (NUMERIC(11,8))
- location_updated_at (TIMESTAMP)
- fcm_token (VARCHAR(255))
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- deleted_at (TIMESTAMP)
```

### **Emergency Alerts Table**
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key → users.id)
- latitude (NUMERIC(10,8))
- longitude (NUMERIC(11,8))
- accuracy (NUMERIC)
- message (TEXT)
- status (TEXT: active/resolved/cancelled)
- resolved_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### **Alert Responses Table**
```sql
- id (UUID, Primary Key)
- alert_id (UUID, Foreign Key → emergency_alerts.id)
- responder_id (UUID, Foreign Key → users.id)
- response_type (TEXT)
- message (TEXT)
- created_at (TIMESTAMP)
```

---

## 🔐 Authentication Flow

### **User Registration**
1. Flutter app → POST `/api/auth/register`
2. Backend creates user in PostgreSQL
3. Backend returns JWT token
4. Flutter creates Firebase user
5. User profile synced

### **User Login**
1. Flutter → Firebase Auth sign-in
2. Flutter gets Firebase ID token
3. Flutter → GET `/api/users/profile` with Bearer token
4. Backend verifies Firebase token
5. Backend returns user profile from PostgreSQL
6. Auto-creates user in DB if Firebase-only

### **Admin Authentication**
- HTTP Basic Auth (username: admin, password: admin123)
- No Firebase dependency
- Direct access to admin routes

---

## 🛣️ API Endpoints

### **Authentication**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (email/password)
- `POST /api/auth/refresh` - Refresh JWT token

### **User Management**
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/:id` - Get user by ID (admin)

### **Emergency Alerts**
- `POST /api/emergency/alerts` - Create SOS alert
- `GET /api/emergency/alerts` - Get user's alerts
- `GET /api/emergency/alerts/:id` - Get alert details
- `PATCH /api/emergency/alerts/:id` - Update alert status
- `DELETE /api/emergency/alerts/:id` - Delete alert

### **Admin Panel**
- `GET /api/admin/` - Admin home
- `GET /api/admin/users` - User list (with search, filters, pagination)
- `GET /api/admin/users/:id` - User details with alerts
- `POST /api/admin/users/:id/verify` - Approve user

---

## 🎨 UI/UX Features

### **Design System**
- Material Design (primary)
- Cupertino (iOS-specific)
- Custom color palette:
  - Crisis Red: Primary emergency color
  - Areiva Teal: Accent color
  - Success Green, Error Red, Warning Orange

### **Theming**
- Light mode support
- Dark mode support
- System theme detection

### **Responsive Design**
- Mobile-first approach
- Tablet optimization
- Web responsive layout

---

## 🔧 Development Tools

### **Code Quality**
- **ESLint** - JavaScript linting (Airbnb style guide)
- **Flutter Lints** - Dart code analysis
- **Prettier** - Code formatting (via editor)

### **Testing**
- **Jest** - Unit testing (Backend)
- **Supertest** - API testing
- **Flutter Test** - Widget testing
- **Mockito** - Mock objects

### **Version Control**
- **Git** - Source control
- **GitHub** - Repository hosting
  - Owner: ANSHU-Ireland
  - Repo: raksha-ireland
  - Branch: main

### **Build & Deployment**
- **Docker** support (Dockerfile included)
- **Flutter Build** - APK/IPA generation
- **npm scripts** - Backend automation

---

## 📦 Package Managers

### **Backend**
- **npm** (v10.9.0)
- **package.json** dependency management
- **package-lock.json** version locking

### **Frontend**
- **pub** (Dart package manager)
- **pubspec.yaml** dependency management
- **pubspec.lock** version locking

---

## 🌍 Environment Variables

### **Backend (.env)**
```bash
DATABASE_URL=postgresql://postgres:RakshaIreland2025@db.mcyruxndjbxpvcjqdgyx.supabase.co:5432/postgres
JWT_SECRET=raksha-ireland-jwt-secret-key-2025
NODE_ENV=development
PORT=3000
FIREBASE_PROJECT_ID=raksha-ireland-app
ADMIN_USER=admin
ADMIN_PASS=admin123
```

### **Flutter (AppConfig)**
```dart
apiBaseUrl=http://localhost:3000/api
firebaseProjectId=raksha-ireland-app
emergencyRadius=3.0 km
sosHoldDuration=3 seconds
locationUpdateInterval=30 seconds
```

---

## 🚀 Deployment Configuration

### **Backend**
- **Port**: 3000
- **Process Manager**: None (Development), PM2/Docker (Production)
- **Database**: Supabase PostgreSQL
- **Logging**: Morgan + Custom logger

### **Mobile App**
- **Web**: Chrome (localhost:61479 during development)
- **Android**: Minimum SDK 21 (Android 5.0)
- **iOS**: Minimum iOS 12.0

---

## 📊 Monitoring & Logging

### **Backend Logging**
- **Morgan**: HTTP request logging
- **Custom Logger**: Application events
- **Log Levels**: INFO, WARN, ERROR

### **Frontend Logging**
- **Debug Mode**: Flutter DevTools
- **Console Logging**: Development only
- **Crash Reporting**: Not yet implemented

---

## 🔒 Security Features

### **Backend Security**
- CORS protection
- Helmet security headers
- Rate limiting (API endpoints)
- Password hashing (bcrypt with salt rounds)
- JWT token expiration
- SQL injection prevention (Knex parameterized queries)
- Input validation (Joi schemas)

### **Mobile Security**
- Secure storage for tokens
- HTTPS-only API calls (production)
- Firebase security rules
- Permission-based access

---

## 📈 Performance Optimizations

### **Backend**
- Response compression (gzip)
- Database connection pooling
- Async/await patterns
- Indexed database queries

### **Frontend**
- Image caching
- HTTP caching
- Lazy loading
- Optimized bundle size
- Shimmer loading states

---

## 🧪 Testing Strategy

### **Backend Testing**
- Unit tests (Jest)
- Integration tests (Supertest)
- Code coverage tracking
- Pre-commit hooks (Husky + Lint-staged)

### **Frontend Testing**
- Widget tests (Flutter Test)
- Mock API calls (Mockito)
- Manual testing (Chrome DevTools)

---

## 📝 Documentation

- **README.md** - Project overview
- **API Documentation** - Available at `/api/docs`
- **Code Comments** - JSDoc (Backend), Dart Doc (Frontend)
- **TECH_STACK.md** - This file

---

## 🎯 Key Features Implementation Status

### ✅ Completed Features
1. **User Authentication**
   - Email/Password registration & login
   - Firebase Google Sign-In
   - JWT token management
   - Auto user creation for Firebase users

2. **User Profile Management**
   - View profile in app
   - Edit name, nationality, phone
   - Real-time sync with backend
   - Pull-to-refresh support

3. **Admin Panel**
   - User list with search & filters
   - Pagination controls
   - User approval workflow
   - User details with alerts history
   - Real-time data sync

4. **Emergency Alert System**
   - SOS button (3-second hold)
   - GPS location tracking
   - Alert creation & history
   - Status management (active/resolved)

5. **Location Services**
   - Real-time GPS tracking
   - Location permissions
   - Geocoding support
   - Map integration

6. **Push Notifications**
   - FCM integration
   - Local notifications
   - Background message handling

### 🚧 Planned Features
1. Alert responses & community help
2. Geofencing & proximity alerts
3. Multi-language support
4. Offline mode
5. Analytics dashboard
6. Email notifications
7. SMS alerts
8. Emergency contact management

---

## 📞 Support & Contact

- **Project**: Raksha Ireland Emergency Alert System
- **Purpose**: Safety network for immigrants and residents in Ireland
- **Repository**: https://github.com/ANSHU-Ireland/raksha-ireland
- **Admin Panel**: http://localhost:3000/api/admin/users
- **API Base**: http://localhost:3000/api

---

**Last Updated**: December 6, 2025
**Version**: 1.0.0
**Build**: Production-ready development build
