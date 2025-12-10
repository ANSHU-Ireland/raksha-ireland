# Admin Panel Quick Start Guide

## 🚀 Starting the Admin Panel

### Option 1: Using npm directly
```bash
cd /Users/areiva/Desktop/Raksha/raksha-ireland/admin-panel
npm start
```

### Option 2: Using the startup script
```bash
cd /Users/areiva/Desktop/Raksha/raksha-ireland/admin-panel
./start-admin-panel.sh
```

The admin panel will open automatically in your browser at **http://localhost:3001**

## ✅ Current Status

**Backend API**: ✓ Running on http://localhost:3000
**Admin Endpoints**: ✓ All working
**Test Users**: ✓ 3 users created
  - Test User (activated)
  - Jane Smith (pending)
  - John Doe (pending)

## 📋 How to Use

1. **Open Admin Panel**: Navigate to http://localhost:3001 in your browser
2. **View Users**: All registered users appear in the table
3. **Approve User**: Click "✓ Approve" button next to pending users
4. **Reject User**: Click "✗ Reject" button (you'll get a confirmation prompt)
5. **Refresh**: Click the "🔄 Refresh" button to reload the user list

## 🔌 API Endpoints Available

- `GET /admin/users` - Get all users with full details
- `POST /approve-user` - Approve a pending user
  ```bash
  curl -X POST http://localhost:3000/approve-user \
    -H "Content-Type: application/json" \
    -d '{"userId": "user-1234567890"}'
  ```

- `POST /reject-user` - Reject a user registration
  ```bash
  curl -X POST http://localhost:3000/reject-user \
    -H "Content-Type: application/json" \
    -d '{"userId": "user-1234567890"}'
  ```

## 📊 User Statuses

- **Pending** (Yellow badge): New registration awaiting approval
- **Active** (Green badge): Approved user with full app access
- **Rejected** (Red badge): Registration denied

## 🧪 Testing

Test the workflow by creating a new user in the mobile app:
1. Open Raksha app on iOS simulator
2. Go to Sign Up
3. Fill in user details and register
4. Open admin panel to see the new user with "Pending" status
5. Approve or reject the user
6. User status will update immediately

## 🛠️ Troubleshooting

**Panel won't load?**
- Ensure backend server is running: `curl http://localhost:3000/health`
- Check port 3001 is not in use: `lsof -i :3001`

**No users appearing?**
- Create test users using signup endpoint
- Check backend logs for errors
- Verify `/admin/users` endpoint works: `curl http://localhost:3000/admin/users`

**Approval not working?**
- Check browser console for errors
- Verify userId is correct
- Check backend logs: `tail -f /path/to/mock-server.log`

## 🎨 Features

- ✅ Real-time user statistics dashboard
- ✅ Responsive table design
- ✅ Color-coded status badges
- ✅ Confirmation dialogs for destructive actions
- ✅ Loading states for better UX
- ✅ Error handling and user feedback
- ✅ Mobile-responsive layout
