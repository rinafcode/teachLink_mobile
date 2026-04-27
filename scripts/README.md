# TeachLink Mobile Deployment Scripts

This directory contains deployment scripts for the TeachLink mobile app using Expo Application Services (EAS).

## Available Scripts

### 📱 Platform-Specific Deployments

- **`deploy-android.sh`** - Build and deploy Android app to Google Play Store
- **`deploy-ios.sh`** - Build and deploy iOS app to App Store

### 🔄 Cross-Platform Deployments

- **`deploy-both.sh`** - Build and deploy to both app stores simultaneously
- **`deploy-preview.sh`** - Create preview builds for testing

## Usage

### Prerequisites

1. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```

2. Login to your Expo account:
   ```bash
   eas login
   ```

3. Configure your app with EAS:
   ```bash
   eas build:configure
   ```

### Deployment Commands

#### Quick Deployment (using npm scripts)

```bash
# Deploy to Android
npm run deploy:android

# Deploy to iOS
npm run deploy:ios

# Deploy to both platforms
npm run deploy:both

# Create preview build
npm run deploy:preview
```

#### Manual Deployment

```bash
# Make scripts executable (on Unix systems)
chmod +x scripts/*.sh

# Run specific script
./scripts/deploy-android.sh
./scripts/deploy-ios.sh
./scripts/deploy-both.sh
./scripts/deploy-preview.sh
```

### Build Profiles

The app uses different build profiles configured in `eas.json`:

- **`development`** - For development builds with fast refresh
- **`preview`** - For internal testing and QA
- **`production`** - For app store releases

## Configuration

### Android Setup

1. Create a Google Play Console account
2. Set up your app in the Play Console
3. Generate a service account key JSON file
4. Update `eas.json` with your service account path

### iOS Setup

1. Create an Apple Developer account
2. Set up your app in App Store Connect
3. Update `eas.json` with your Apple ID and team information

## Environment Variables

Make sure to set up your environment variables in `.env`:

```env
EXPO_PUBLIC_API_URL=your-api-endpoint
EXPO_PUBLIC_ENVIRONMENT=production
```

## Troubleshooting

### Common Issues

1. **Authentication errors**: Run `eas login` to re-authenticate
2. **Build failures**: Check the EAS dashboard for detailed logs
3. **Missing credentials**: Ensure all required certificates and keys are properly configured

### Getting Help

- [EAS Documentation](https://docs.expo.dev/build/introduction/)
- [Expo Forums](https://forums.expo.dev/)
- [React Native Community](https://github.com/react-native-community)

## Security Notes

- Never commit sensitive credentials to version control
- Use environment variables for API keys and secrets
- Regularly rotate your service account keys
- Review app permissions before submission
