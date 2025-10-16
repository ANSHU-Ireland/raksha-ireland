# RAKSHA-IRELAND SOS App

A low-bandwidth SOS mobile application with manual user approval and admin dashboard.

## Project Structure

```
raksha-ireland/
├── mobile/          # Expo React Native app (Android + iOS)
├── backend/         # AWS Lambda functions + API Gateway
├── admin-panel/     # React dashboard for user management
└── README.md
```

## Features

- **Mobile App**: SOS emergency button with location tracking
- **User Management**: Manual approval workflow with email activation
- **Admin Dashboard**: Web-based user approval interface
- **Low Bandwidth**: Optimized for areas with poor connectivity

## Tech Stack

- **Frontend**: React Native (Expo), React (Vite)
- **Backend**: AWS Lambda, API Gateway, DynamoDB, SES, Cognito
- **Location**: H3 geospatial indexing for proximity queries
- **Notifications**: Expo push notifications + AWS SNS

## Getting Started

See individual directories for setup instructions:
- [Mobile App Setup](./mobile/README.md)
- [Backend Setup](./backend/README.md)
- [Admin Panel Setup](./admin-panel/README.md)