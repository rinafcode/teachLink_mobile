#!/bin/bash

# TeachLink Preview Build Script
# This script creates preview builds for testing

echo "🚀 Starting TeachLink preview build..."

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

# Create preview build
echo "🔨 Creating preview build..."
eas build --platform all --profile preview

echo "✅ Preview build completed!"
echo "📱 Install the build using the Expo Go app or scan the QR code"
