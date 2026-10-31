#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
source scripts/android-env.sh

npx expo prebuild --platform android --no-install
(cd android && ./gradlew assembleDebug --no-daemon)
echo "Android APK: $(pwd)/android/app/build/outputs/apk/debug/app-debug.apk"
