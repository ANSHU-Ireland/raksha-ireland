# Raksha Ireland Emergency App

An emergency alert system for immigrants and residents in Ireland, providing real-time location-based SOS broadcasting and community safety features.

## Project Overview

Raksha Ireland is a comprehensive emergency response application that enables users to broadcast SOS alerts to verified users within a 3km radius. The app includes manual verification, secure onboarding, and real-time geolocation services.

**Principal Sponsor:** Areiva

## Project Structure

```
raksha-ireland/
├── mobile-app/          # Flutter cross-platform mobile app
├── backend/             # Node.js API server with PostgreSQL
├── admin-panel/         # React admin dashboard for verification
├── infrastructure/      # AWS/GCP deployment configs
├── docs/               # Documentation and guidelines
└── README.md           # This file
```

## Core Features

- **Emergency SOS Broadcasting**: Hold button to alert nearby verified users
- **Manual Verification System**: Admin-reviewed user verification process
- **Location-Based Alerts**: 3km geofenced emergency notifications
- **Secure Onboarding**: Email verification with secure password setup
- **Widget Support**: Quick SOS access from device home screen
- **Multilingual Support**: English + 5 immigrant languages
- **GDPR Compliance**: Privacy-focused with encrypted data

## Technology Stack

### Mobile App
- **Framework**: Flutter (iOS & Android)
- **Authentication**: Firebase Auth
- **Push Notifications**: FCM + APNS
- **Location Services**: Geolocator + Google Maps

### Backend
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL with PostGIS
- **Authentication**: JWT tokens
- **Messaging**: Firebase Cloud Messaging
- **Email**: AWS SES / SendGrid

### Infrastructure
- **Hosting**: AWS Lambda / Google Cloud Run
- **Storage**: AWS S3 / Google Cloud Storage
- **Monitoring**: CloudWatch / Stackdriver
- **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites
- Flutter SDK 3.10+
- Node.js 18+
- PostgreSQL 14+
- Firebase project
- AWS/GCP account

### Quick Setup
1. Clone the repository
2. Navigate to each component directory
3. Follow setup instructions in each README
4. Configure environment variables
5. Deploy infrastructure components

## Architecture

### Security & Privacy
- AES-256 encryption at rest
- TLS 1.3 for data in transit
- Hashed location coordinates
- Rate limiting for SOS triggers
- GDPR-compliant data handling

### Scalability
- Serverless functions for burst handling
- GeoHash-indexed database
- Redis caching layer
- Auto-scaling groups

## Brand Guidelines

### Colors
- **Primary**: #E63946 (Crisis Red)
- **Secondary**: #F1FAEE (Off-white)
- **Areiva Teal**: #005F73 (Headers/accents)
- **Areiva Light**: #94D2BD (Secondary buttons)

### Typography
- **Titles**: Montserrat Bold
- **Body**: Inter/Roboto

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

## Support

For support, email support@raksha-ireland.org or create an issue in this repository.