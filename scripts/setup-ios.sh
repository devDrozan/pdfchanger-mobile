#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
source scripts/ios-env.sh

if [[ ! -x "$GEM_HOME/bin/bundle" ]]; then
  gem install bundler -v 2.4.22 --install-dir "$GEM_HOME" --no-document
fi
bundle install

if [[ ! -d ios ]]; then
  npx expo prebuild --platform ios --no-install
fi

mkdir -p "$EXPO_CUSTOM_BUILD_ROOT"
ln -sfn "$PWD/node_modules/expo-modules-jsi/apple/Products" "$EXPO_CUSTOM_BUILD_ROOT/Products"

if [[ ! -f ios/Pods/Manifest.lock || ! -f ios/Podfile.lock || package.json -nt ios/Pods/Manifest.lock || app.json -nt ios/Pods/Manifest.lock ]] || ! cmp -s ios/Pods/Manifest.lock ios/Podfile.lock; then
  (cd ios && bundle exec pod install)
else
  echo "CocoaPods dependencies are already installed."
fi

echo "iOS dependencies are ready. Run: npm run ios -- --device 'iPhone 17'"
