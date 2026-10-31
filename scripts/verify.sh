#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
output_dir="$(mktemp -d)"
trap 'rm -rf "$output_dir"' EXIT

npm run typecheck
npm test
npx expo export --platform ios --platform android --output-dir "$output_dir"
