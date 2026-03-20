import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  name: "Raalhu",
  slug: "raalhu",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "raalhu",
  userInterfaceStyle: "dark",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#242526",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.raalhu.app",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#242526",
    },
    package: "com.raalhu.app",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-build-properties",
      {
        android: {
          usesCleartextTraffic: true,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
});
