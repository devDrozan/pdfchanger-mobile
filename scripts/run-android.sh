#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
source scripts/android-env.sh
bash scripts/clean-android-generated-copies.sh
exec npx expo run:android "$@"
