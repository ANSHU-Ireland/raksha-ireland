#!/bin/bash
# Load environment variables from .env file
set -a
source /home/ubuntu/raksha-ireland/backend/.env
set +a

# Start the Node.js server
exec node /home/ubuntu/raksha-ireland/backend/local-mock-server.js
