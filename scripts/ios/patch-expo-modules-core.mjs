import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Xcode 27's Swift compiler crashes on the redundant Error cast in Expo 58's
// consumed Result switch. Keep this adjustment in place after npm install.
const file = resolve(
  'node_modules/expo-modules-core/ios/Core/Functions/AsyncFunctionDefinition.swift'
);
const before = 'case .failure(let error as any Error):';
const after = 'case .failure(let error):';
const source = readFileSync(file, 'utf8');

if (source.includes(after)) {
  process.exit(0);
}
if (!source.includes(before)) {
  throw new Error('ExpoModulesCore changed; review the iOS Swift compiler workaround.');
}

writeFileSync(file, source.replace(before, after));
console.log('Applied ExpoModulesCore iOS Swift compiler workaround.');
