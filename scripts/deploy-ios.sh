#!/bin/bash

# TeachLink iOS Deployment Script
# This script builds and deploys the iOS app to App Store

echo "🚀 Starting TeachLink iOS deployment..."

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

# Build for iOS production
echo "🔨 Building iOS IPA for production..."
eas build --platform ios --profile production

# Submit to App Store
echo "📤 Submitting to App Store..."
eas submit --platform ios --profile production

echo "✅ iOS deployment completed!"
