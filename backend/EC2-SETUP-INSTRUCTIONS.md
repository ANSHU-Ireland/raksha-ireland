# EC2 Setup Instructions

## SSH Connection Command
```bash
ssh -i "raksha-ireland-key.pem" ubuntu@3.254.75.134
```

## Once connected, run these commands:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version

# Install PM2
sudo npm install -g pm2

# Clone repository
git clone https://github.com/ANSHU-Ireland/raksha-ireland.git
cd raksha-ireland/backend

# Install dependencies
npm install
```

## Copy .env file to EC2
On your Windows machine, run:
```powershell
scp -i "raksha-ireland-key.pem" .env ubuntu@3.254.75.134:~/raksha-ireland/backend/
```

## Start the backend
```bash
cd ~/raksha-ireland/backend
pm2 start src/server.js --name raksha-backend
pm2 startup
pm2 save
pm2 status
pm2 logs raksha-backend
```

## Your Backend URL
```
http://3.254.75.134:3000
```

## Update Flutter App
Edit: `mobile-app/lib/core/config/app_config.dart`

Change:
```dart
static const String baseUrl = 'http://192.168.8.70:3000';
```

To:
```dart
static const String baseUrl = 'http://3.254.75.134:3000';
```

Then rebuild APK:
```bash
cd mobile-app
flutter build apk --release
```

##  Cost: FREE for 12 months!
