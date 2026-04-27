#!/bin/bash

# TeachLink Android Deployment Script
# This script builds and deploys the Android app to Google Play Store

echo "🚀 Starting TeachLink Android deployment..."

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

# Build for Android production
echo "🔨 Building Android APK for production..."
eas build --platform android --profile production

# Submit to Google Play Store
echo "📤 Submitting to Google Play Store..."
eas submit --platform android --profile production

echo "✅ Android deployment completed!"
