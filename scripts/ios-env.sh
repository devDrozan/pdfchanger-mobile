#!/usr/bin/env bash

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Local iOS builds require macOS and Xcode." >&2
  exit 1
fi
if ! xcodebuild -version >/dev/null 2>&1; then
  echo "Xcode is unavailable. Install Xcode and select it with xcode-select." >&2
  exit 1
fi

ios_project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ios_local_dir="$ios_project_dir/.local/ios"
ios_ruby_version="$(ruby -rrbconfig -e 'print RbConfig::CONFIG["ruby_version"]')"
export GEM_HOME="$ios_local_dir/gems"
export GEM_PATH="$GEM_HOME:$ios_local_dir/vendor/ruby/$ios_ruby_version"
export BUNDLE_GEMFILE="$ios_project_dir/scripts/ios/Gemfile"
export BUNDLE_PATH="$ios_local_dir/vendor"
export RUBYOPT="-rlogger -r$ios_project_dir/scripts/ios/ruby-headers.rb ${RUBYOPT:-}"
export PATH="$GEM_HOME/bin:$BUNDLE_PATH/ruby/$ios_ruby_version/bin:$PATH"

# Expo's SwiftPM framework is signed during its nested build. Keep its build
# output outside cloud-synced Desktop folders, where Finder metadata breaks signing.
export EXPO_CUSTOM_BUILD_ROOT="${TMPDIR:-/private/tmp}/pdfchanger-expo-jsi-$(id -u)"
