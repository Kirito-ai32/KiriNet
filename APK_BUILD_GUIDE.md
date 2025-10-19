# KiriNet APK Build Guide

This guide explains how to generate an APK file for the KiriNet messenger app.

## Prerequisites

1. **Expo Account**: Create a free account at [expo.dev](https://expo.dev)
2. **EAS CLI**: Install Expo Application Services CLI
3. **Node.js**: Version 18 or higher
4. **Git**: For version control

## Setup Instructions

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
cd /app/frontend
eas login
```

Enter your Expo credentials when prompted.

### Step 3: Configure EAS Build

The project already includes `app.json` configuration. Update the following fields if needed:

```json
{
  "expo": {
    "name": "KiriNet",
    "slug": "kirinet",
    "version": "1.0.0",
    "android": {
      "package": "com.kirinet.messenger",
      "versionCode": 1
    }
  }
}
```

### Step 4: Create EAS Configuration

Create `eas.json` in `/app/frontend/`:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

### Step 5: Build APK

#### For Testing (APK):

```bash
cd /app/frontend
eas build --platform android --profile preview
```

This will:
1. Upload your project to Expo servers
2. Build the APK in the cloud
3. Provide a download link when complete

#### For Production (AAB for Google Play):

```bash
cd /app/frontend
eas build --platform android --profile production
```

### Step 6: Download APK

Once the build completes (usually 10-20 minutes):

1. EAS CLI will provide a download URL
2. Download the APK file
3. Transfer to your Android device

Or view builds at: https://expo.dev/accounts/[your-account]/projects/kirinet/builds

## Installing APK on Android Device

### Method 1: Direct Download
1. Open the build URL on your Android device
2. Download the APK
3. Open the downloaded file
4. Allow installation from unknown sources if prompted
5. Install the app

### Method 2: USB Transfer
1. Download APK to your computer
2. Connect Android device via USB
3. Enable File Transfer mode
4. Copy APK to device's Download folder
5. Use file manager app to install

### Method 3: ADB Install
```bash
adb install kirinet.apk
```

## Alternative: Expo Go (for Development)

For quick testing without building APK:

1. Install **Expo Go** app from Google Play Store
2. Run development server:
   ```bash
   cd /app/frontend
   yarn start
   ```
3. Scan QR code with Expo Go app

## Build Configuration Options

### Android-Specific Options

Add to `app.json`:

```json
{
  "expo": {
    "android": {
      "permissions": [
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "VIBRATE"
      ],
      "icon": "./assets/icon.png",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0a0a0f"
      },
      "splash": {
        "image": "./assets/splash.png",
        "resizeMode": "contain",
        "backgroundColor": "#0a0a0f"
      }
    }
  }
}
```

## Custom App Icons

### Create Icons

Required sizes for Android:
- **icon.png**: 1024x1024 (app icon)
- **adaptive-icon.png**: 1024x1024 (Android adaptive icon)
- **splash.png**: 1284x2778 (splash screen)

Place in `/app/frontend/assets/`

### Icon Design Tips
- Use KiriNet logo with neon purple/cyan glow
- Dark background to match app theme
- Japanese katakana キリネット
- Cyberpunk aesthetic

## Environment Variables for Production

Create `.env.production` in `/app/frontend/`:

```env
EXPO_PUBLIC_BACKEND_URL=https://your-production-api.com
```

Then build with:
```bash
eas build --platform android --profile production
```

## Troubleshooting

### Build Fails
- Check `app.json` for syntax errors
- Ensure all dependencies are in `package.json`
- Verify Expo SDK version compatibility

### APK Won't Install
- Enable "Install from Unknown Sources" in Android settings
- Check Android version (minimum API 21 / Android 5.0)
- Verify sufficient storage space

### App Crashes on Launch
- Check backend URL in environment variables
- Verify permissions in `app.json`
- Review build logs at expo.dev

## Build Times

| Build Type | Estimated Time |
|------------|----------------|
| Preview APK | 10-15 minutes |
| Production AAB | 15-25 minutes |
| Development (Expo Go) | Instant |

## Cost

- **EAS Build**: Free tier includes limited builds per month
- **Additional builds**: Check [pricing](https://expo.dev/pricing)
- **Alternative**: Build locally with `eas build --local` (requires Android SDK)

## Post-Build Steps

1. **Test APK**: Install on multiple Android devices
2. **Version Control**: Tag the release in Git
3. **Documentation**: Update version numbers
4. **Distribution**: Share APK or publish to Google Play Store

## Publishing to Google Play Store

1. Build production AAB:
   ```bash
   eas build --platform android --profile production
   ```

2. Create Google Play Console account
3. Create new application
4. Upload AAB file
5. Fill in store listing details:
   - App name: KiriNet - キリネット
   - Description: Japanese Cyberpunk Messenger
   - Screenshots: Include app screens
   - Category: Communication

6. Set up pricing (free)
7. Submit for review

## Continuous Deployment

For automated builds on code changes:

1. Set up GitHub repository
2. Configure EAS Build webhooks
3. Enable automatic builds on push
4. Set up notifications for build completion

## Support

- **Expo Documentation**: https://docs.expo.dev
- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **Community**: https://forums.expo.dev

---

**Note**: Building requires a stable internet connection and may take 15-20 minutes for the first build. Subsequent builds are usually faster due to caching.
