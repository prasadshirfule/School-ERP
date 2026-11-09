import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.schoolerp.platform",
  appName: "School ERP",
  webDir: "public",
  server: {
    // Direct HTTPS connection to hosted production School ERP
    url: "https://school-erp-wb73.vercel.app",
    androidScheme: "https",
    cleartext: true, // Enables optional local HTTP development testing
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#1e3a8a",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK" as any,
      backgroundColor: "#1e3a8a",
    },
  },
};

export default config;
