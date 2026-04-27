#!/bin/bash

# TeachLink Cross-Platform Deployment Script
# This script builds and deploys both Android and iOS apps

echo "🚀 Starting TeachLink cross-platform deployment..."

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g eas-cli
fi

# Check if user is logged in to EAS
echo "🔐 Checking EAS authentication..."
if ! eas whoami &> /dev/null; then
    echo "Please login to your Expo account:"
    eas login
fi

# Build for both platforms
echo "🔨 Building for Android and iOS..."
eas build --platform all --profile production

# Submit to both stores
echo "📤 Submitting to both app stores..."
eas submit --platform all --profile production

echo "✅ Cross-platform deployment completed!"
