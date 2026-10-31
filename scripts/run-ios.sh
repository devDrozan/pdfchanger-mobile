#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
bash scripts/setup-ios.sh
source scripts/ios-env.sh
unset SDKROOT
exec npx expo run:ios "$@"
