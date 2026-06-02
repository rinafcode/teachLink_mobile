# TeachLink Mobile Deployment Scripts

This directory contains deployment scripts for the TeachLink mobile app using Expo Application Services (EAS).

> For the full deployment guide, see [DEPLOY.md](./DEPLOY.md)  

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

---

## Deployment

TeachLink Mobile uses **Expo Application Services (EAS)** for building and submitting to the app stores.

> For the full deployment guide, see **[DEPLOY.md](./DEPLOY.md)**

### Quick Start

```bash
# Install EAS CLI
npm install -g eas-cli

# Authenticate
eas login

# Deploy to Android
npm run deploy:android

# Deploy to iOS
npm run deploy:ios

# Deploy to both stores
npm run deploy:both

# Create a preview build for testing
npm run deploy:preview
```

### Environment Setup

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_API_BASE_URL=https://api.teachlink.com
EXPO_PUBLIC_SOCKET_URL=wss://api.teachlink.com
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
```

> Never commit your `.env` file. It is listed in `.gitignore`.

See [DEPLOY.md](./DEPLOY.md) for platform-specific setup (Google Play & App Store), build profiles, troubleshooting, and security notes.


---

## Performance & Monitoring Scripts

### CI/CD Build Monitoring
- **`monitorCIBuildTimes.js`** - Monitors CI/CD build times and cache effectiveness
  ```bash
  # Monitor last 7 days
  npm run ci:monitor
  
  # Generate report
  npm run ci:monitor:report
  
  # Output as JSON
  npm run ci:monitor:json
  
  # Custom period
  node scripts/monitorCIBuildTimes.js --workflow=ci-optimized --days=30
  ```

### Cache Testing
- **`testCacheInvalidation.js`** - Tests cache invalidation strategies
  ```bash
  node scripts/testCacheInvalidation.js
  ```

### Performance Testing
- **`checkBundleSize.js`** - Validates bundle size against performance budgets
- **`checkPerfRegression.js`** - Detects performance regressions in builds
- **`updatePerfBaseline.js`** - Updates performance baseline metrics
- **`measureStartupTime.js`** - Measures app startup time
- **`analyzeRouteSizes.js`** - Analyzes route bundle sizes
- **`measureRouteBundle.sh`** - Measures individual route bundle sizes
- **`checkApiPerf.js`** - Checks API endpoint performance
- **`k6-api-benchmark.js`** - Load testing with k6
- **`validateOpenApi.js`** - Validates OpenAPI specifications

### Asset Optimization
- **`subset-fonts.js`** - Subsets fonts to reduce file size (Node.js version)
- **`subset-fonts.py`** - Subsets fonts to reduce file size (Python version)
- **`analyze-fonts.js`** - Analyzes font usage and optimization opportunities
- **`measure_styles.js`** - Measures stylesheet sizes

## CI/CD Performance Optimization

The project implements comprehensive caching strategies to reduce CI/CD build times from **10-15 minutes to 2-3 minutes** (80% reduction).

### Key Features
- ✅ Multi-layer dependency caching (npm, pip, Gradle, CocoaPods)
- ✅ Build artifact caching (TypeScript, Jest, ESLint, Metro)
- ✅ Native build caching (Android/iOS)
- ✅ Incremental compilation support
- ✅ Automated cache invalidation
- ✅ Build time monitoring and alerting

### Performance Targets
- **Average Build Time**: ≤ 3 minutes (with cache hits)
- **Cache Hit Rate**: ≥ 80%
- **Success Rate**: ≥ 95%

### Monitoring Build Performance

```bash
# Check current build performance
npm run ci:monitor

# Generate detailed report
npm run ci:monitor:report

# Test cache invalidation
node scripts/testCacheInvalidation.js
```

## Related Documentation
- [CI/CD Caching Strategy](../docs/CI_CD_CACHING_STRATEGY.md)
- [Performance Monitoring](../docs/PERFORMANCE_MONITORING.md)
- [Performance Testing](../docs/PERFORMANCE_TESTING.md)
- [Performance Thresholds](../docs/PERFORMANCE_THRESHOLDS.md)
