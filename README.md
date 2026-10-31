# PDF Changer mobile app

Photograph pages or import photos, arrange and edit them, and save one PDF. You can also select multiple PDFs, put them in order, and merge them. Completed PDFs stay in the app's local library, where you can preview, rename, delete, or send them to Merge PDFs. Document processing works offline.

## Run the app

Install Node.js 22.13+ and the Android or iOS development tools for your device. In this folder, run `npm install`. Run `npm run ios` or `npm run android` to create a development build. After the first build, use `npm start` for the development server.

### iPhone simulator on macOS

Install Xcode and an iOS simulator in Xcode Settings, then run:

```sh
xcrun simctl list devices available
npm run ios:setup
npm run ios -- --device "iPhone 17"
```

Replace `iPhone 17` with an available simulator name. `ios:setup` installs a compatible CocoaPods version into `.local/ios`, generates the ignored `ios/` project from Expo config if needed, and installs pods. `npm run ios` also runs setup, so the explicit setup command is only needed when checking dependencies separately. Keep the Metro terminal open while testing. The simulator can test image import, PDF creation and merging, library and Recent persistence, preview, rename, and delete. Test camera capture and camera permissions on a physical iPhone; the simulator has no document camera.

The iOS build uses temporary framework output outside the project to avoid macOS Finder metadata causing a code-signing error when the repository is in a cloud-synced Desktop folder. Expo iOS modules build from source because the precompiled File System and Modules Core frameworks caused a launch crash with this toolchain; the first native build takes longer. If Xcode reports a simulator build failure, rerun `npm run ios -- --device "iPhone 17"` once after dependencies finish compiling.

To install on a physical iPhone, connect and trust it, enable Developer Mode, and run `npm run ios -- --device`. Select the phone in Expo's device list. Reinstalling the development build over the existing app updates native modules while preserving the app's local library. Keep the phone and Mac on the same network for Metro, then run `npm start` for later JavaScript changes.

### Android emulator on macOS

The Android command finds the Android Studio JDK and SDK automatically; set `JAVA_HOME` and `ANDROID_HOME` if yours are elsewhere. Start an emulator from Android Studio, then run `npm run android`.

### Android App Bundle

The `production` EAS profile builds a signed `.aab` for Google Play and increments the Android version code. This folder is not yet a Git repository, so run:

```sh
EAS_NO_VCS=1 eas build --platform android --profile production
```

Sign in to the Expo account linked to this project before building. Download the finished bundle from the build page shown by EAS CLI. An `.aab` is for store upload; use `npm run android:build` for an installable debug APK. Building does not submit the app to Google Play.

Run `npm run verify` to check types, PDF behavior, and JavaScript bundles for both platforms. Run `npm run android:build` to compile a debug APK; it finds the Android SDK and Android Studio JDK in their standard macOS locations, or uses `ANDROID_HOME` and `JAVA_HOME` if you set them. Run the camera, picker, merge selection, and file preview flows on real devices before release.

## App use

Choose **New PDF** to photograph pages with the camera or import images from Photos or Files. Use the page controls to crop, rotate, remove, or reorder pages before saving. In **Library**, tap **Move to Merge PDFs** to add a completed PDF to the merge selection and its **Recent** list; the library PDF stays in place. In **Merge PDFs**, add more from Recent or tap **Choose PDFs** to pick files, arrange at least two selected PDFs, and save one combined file. Recent entries persist between app launches and disappear when their library PDF is deleted. **Camera photo** works offline.

Camera and photo permissions are requested only when you use those features. Source files are not changed. Deleting a library PDF removes the app's saved copy.
