#!/usr/bin/env bash
set -euo pipefail

# Cloud-synced folders can leave numbered copies of Expo's generated Kotlin file.
# Both files declare the same class, so Kotlin fails with a redeclaration error.
generated_dir="$(dirname "$0")/../node_modules/expo/android/build/inline/modules"
if [[ -d "$generated_dir" ]]; then
  find "$generated_dir" -maxdepth 1 -type f -name 'ExpoInlineModulesList [0-9]*.kt' -delete
fi
