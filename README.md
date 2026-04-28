Here is the complete, consolidated `README.md` file. It incorporates your latest cleanup, updates the **Folder Structure** to accurately reflect your current directory, and ensures the repo links match your terminal path.

```markdown
# TeachLink Mobile

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start the app**

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a:
- [Development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
git clone [https://github.com/rinafcode/teachLink_mobile.git](https://github.com/rinafcode/teachLink_mobile.git)
cd teachLink_mobile
cp .env.example .env
npm install
npx expo start
```

## Features
- **Cross-platform (iOS & Android)**
- **Share and browse knowledge content**
- **Live chat and push notifications**
- **Earn from your contributions**
- **Dark/light mode**

## Folder Structure

```text
.
├── app/                # Expo Router: File-based routing & layouts
├── assets/             # Media (Images, Fonts, Icons)
├── components/         # Reusable UI components
├── constants/          # App-wide constants (Colors, API endpoints)
├── docs/               # Project documentation & troubleshooting logs
├── hooks/              # Custom React hooks
├── scripts/            # Build and maintenance scripts
├── src/                # Shared business logic and services
├── app.json            # Expo configuration
├── tailwind.config.js  # NativeWind styling configuration
└── tsconfig.json       # TypeScript configuration
```

## Resources
- [Figma Design](https://www.figma.com/design/0RX6a19AbtemWmq8GLX1Y4/TeachLink-Project?node-id=0-1&t=gfrhW9c55Pxnfrl1-0)
```