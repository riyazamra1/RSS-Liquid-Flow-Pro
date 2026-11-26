import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('android');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name === 'MainActivity.kt') files.push(full);
  }
}
walk(path.join(root, 'app/src/main'));
if (files.length !== 1) throw new Error('Expected one generated MainActivity.kt');
const activityPath = files[0];
let activity = fs.readFileSync(activityPath, 'utf8');
const pkg = activity.match(/^package\\s+([A-Za-z0-9_.]+)/m)?.[1];
if (!pkg) throw new Error('Cannot read Android package name');
const pluginSource = fs.readFileSync('native/android/RssAppUpdaterPlugin.kt', 'utf8')
  .replace(/^package .*$/m, 'package ' + pkg);
const pluginDir = path.join(root, 'app/src/main/java', ...pkg.split('.'));
fs.mkdirSync(pluginDir, { recursive: true });
fs.writeFileSync(path.join(pluginDir, 'RssAppUpdaterPlugin.kt'), pluginSource);

if (!activity.includes('RssAppUpdaterPlugin::class.java')) {
  if (!activity.includes('import android.os.Bundle')) activity = activity.replace(/(package [^\\n]+\\n)/, '$1\\nimport android.os.Bundle\\n');
  if (/class MainActivity\\s*:\\s*BridgeActivity\\s*\\(\\s*\\)/.test(activity)) {
    activity = activity.replace(/class MainActivity\\s*:\\s*BridgeActivity\\s*\\(\\s*\\)/,
      'class MainActivity : BridgeActivity() {\\n    override fun onCreate(savedInstanceState: Bundle?) {\\n        registerPlugin(RssAppUpdaterPlugin::class.java)\\n        super.onCreate(savedInstanceState)\\n    }\\n}');
  } else if (/override fun onCreate\\(savedInstanceState: Bundle\\?\\)\\s*\\{/.test(activity)) {
    activity = activity.replace(/(override fun onCreate\\(savedInstanceState: Bundle\\?\\)\\s*\\{)/, '$1\\n        registerPlugin(RssAppUpdaterPlugin::class.java)');
  } else {
    throw new Error('Unsupported generated MainActivity template; updater plugin was not registered');
  }
}
fs.writeFileSync(activityPath, activity);

const manifestPath = path.join(root, 'app/src/main/AndroidManifest.xml');
let manifest = fs.readFileSync(manifestPath, 'utf8');
if (!manifest.includes('android.permission.INTERNET')) {
  manifest = manifest.replace('<manifest ', '<manifest ');
  manifest = manifest.replace('<application', '<uses-permission android:name="android.permission.INTERNET" />\\n    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />\\n    <application');
}
if (!manifest.includes('.fileprovider')) {
  manifest = manifest.replace('</application>', `
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/rss_update_paths" />
        </provider>
    </application>`);
}
fs.writeFileSync(manifestPath, manifest);
const xmlDir = path.join(root, 'app/src/main/res/xml');
fs.mkdirSync(xmlDir, { recursive: true });
fs.writeFileSync(path.join(xmlDir, 'rss_update_paths.xml'),
  '<?xml version="1.0" encoding="utf-8"?>\\n<paths xmlns:android="http://schemas.android.com/apk/res/android">\\n    <external-files-path name="rss_update_downloads" path="Download/" />\\n    <cache-path name="rss_update_cache" path="." />\\n</paths>\\n');

const gradlePath = path.join(root, 'app/build.gradle');
let gradle = fs.readFileSync(gradlePath, 'utf8');
if (!gradle.includes('rssBuildVersionCode')) {
  gradle = gradle.replace(/android\\s*\\{/, 'def rssBuildVersionCode = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInteger()\\n\\nandroid {');
  gradle = gradle.replace(/versionCode\\s+\\d+/, 'versionCode rssBuildVersionCode');
  gradle = gradle.replace(/versionName\\s+"[^"]+"/, 'versionName "1.0.${rssBuildVersionCode}"');
}
fs.writeFileSync(gradlePath, gradle);
console.log('Registered RSS native updater, installer provider and build version.');
