# PDF Changer mobile app

Scan pages with your camera or import photos, arrange and edit them, and save one PDF. You can also select multiple PDFs, put them in order, and merge them. Completed PDFs stay in the app's local library, where you can preview, rename, delete, or share them. Document processing works offline.

## Run the app

Install Node.js 22.13+ and the Android or iOS development tools for your device. In this folder, run `npm install`. Run `npm run ios` or `npm run android` to create a development build. The native scanner cannot run in Expo Go. After the first build, use `npm start` for the development server.

Use `npm run typecheck` and `npm test` for checks. Run the camera, picker, file preview, and export flows on real devices before release.

## App use

Choose **New PDF** to automatically scan pages, photograph them with the camera, or import images from Photos or Files. Use the page controls to crop, rotate, remove, or reorder pages before saving. Choose **Merge PDFs** to import two or more PDFs, preview and arrange them, and save one combined file. The **Library** lists completed PDFs and their actions. On Android, automatic scanning may need a one-time Google Play services download; **Camera photo** works offline from first use.

Camera and photo permissions are requested only when you use those features. Source files are not changed. Deleting a library PDF removes the app's saved copy.
