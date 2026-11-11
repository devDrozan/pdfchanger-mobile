const fs = require('node:fs');
const path = require('node:path');
const { withAndroidManifest, withDangerousMod, withGradleProperties } = require('@expo/config-plugins');

const legacyRules = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
  <exclude domain="file" path="." />
</full-backup-content>
`;

const modernRules = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
    <exclude domain="file" path="." />
  </cloud-backup>
  <device-transfer>
    <exclude domain="file" path="." />
  </device-transfer>
</data-extraction-rules>
`;

const releaseManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
          xmlns:tools="http://schemas.android.com/tools">
  <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" tools:node="remove" />
</manifest>
`;

module.exports = function withAndroidPdfBackupRules(config) {
  // The current release dependency set crashes during AndroidX WorkManager startup
  // when R8 minification is enabled. Keep release builds runnable until those
  // dependencies can be updated and verified with shrinking enabled.
  config = withGradleProperties(config, (mod) => {
    const key = 'android.enableMinifyInReleaseBuilds';
    mod.modResults = mod.modResults.filter((item) => item.key !== key);
    mod.modResults.push({ type: 'property', key, value: 'false' });
    return mod;
  });

  config = withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    if (!application) throw new Error('Android application manifest is missing');
    application.$['android:fullBackupContent'] = '@xml/pdfchanger_backup_rules';
    application.$['android:dataExtractionRules'] = '@xml/pdfchanger_data_extraction_rules';
    return mod;
  });

  return withDangerousMod(config, ['android', async (mod) => {
    const xmlDirectory = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
    fs.mkdirSync(xmlDirectory, { recursive: true });
    fs.writeFileSync(path.join(xmlDirectory, 'pdfchanger_backup_rules.xml'), legacyRules);
    fs.writeFileSync(path.join(xmlDirectory, 'pdfchanger_data_extraction_rules.xml'), modernRules);
    // Expo's development launcher needs the overlay permission only in debug builds.
    const releaseDirectory = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'release');
    fs.mkdirSync(releaseDirectory, { recursive: true });
    fs.writeFileSync(path.join(releaseDirectory, 'AndroidManifest.xml'), releaseManifest);
    return mod;
  }]);
};
