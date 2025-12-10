# Raksha Admin Panel

A simple web-based admin panel for managing user registrations in the Raksha Ireland app.

## Features

- **User Management Dashboard**: View all registered users with their details
- **Approval Workflow**: Approve or reject pending user registrations
- **Real-time Statistics**: See counts of total, pending, and active users
- **Modern UI**: Clean, responsive design with gradient styling

## Setup

1. Install dependencies:
```bash
cd admin-panel
npm install
```

2. Start the development server:
```bash
npm start
```

The admin panel will open at `http://localhost:3001` (or the next available port).

## Prerequisites

- The backend mock server must be running at `http://localhost:3000`
- Start the backend server from `/backend` directory:
```bash
cd ../backend
node local-mock-server.js
```

## Usage

1. **View Users**: The dashboard automatically loads all registered users
2. **Approve User**: Click the "✓ Approve" button next to a pending user
3. **Reject User**: Click the "✗ Reject" button (with confirmation) to reject a registration
4. **Refresh**: Use the refresh button to reload the user list

## User Statuses

- **Pending**: New registration awaiting approval
- **Active**: Approved user with full access
- **Rejected**: Registration rejected by admin

## API Endpoints Used

- `GET /admin/users` - Fetch all users
- `POST /approve-user` - Approve a user registration
- `POST /reject-user` - Reject a user registration

## Technologies

- React 18
- Axios for API calls
- CSS3 with gradients and animations
- Create React App

## Production Deployment

For production, build the optimized version:

```bash
npm run build
```

The build files will be in the `/build` directory and can be served by any static file server or deployed to services like Netlify, Vercel, or AWS S3.
