#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
source scripts/android-env.sh
exec npx expo run:android "$@"
