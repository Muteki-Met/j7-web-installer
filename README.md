# J7 Web Installer

Minimal APK installer for Android infotainment systems using ADB over WebUSB.

## Usage

1. Open the page in Chrome on Android.
2. Connect the phone to the car using a USB OTG adapter.
3. Close any other ADB application.
4. Press **Connect to car** and allow USB debugging on the car.
5. Select one APK and press **Install APK**.

The file is transferred directly from the browser to the car. No data is uploaded to a server.

## Build

```sh
npm install
npm run build
```

The static build is generated in `dist/`.
