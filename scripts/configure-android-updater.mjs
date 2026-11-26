import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('android');
const mainActivities = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name === 'MainActivity.java' || entry.name === 'MainActivity.kt') mainActivities.push(full);
  }
}
walk(path.join(root, 'app/src/main'));
if (mainActivities.length !== 1) throw new Error('Expected exactly one generated MainActivity source');
const activityPath = mainActivities[0];
let activity = fs.readFileSync(activityPath, 'utf8');
const pkg = activity.match(/^package\\s+([A-Za-z0-9_.]+)/m)?.[1];
if (!pkg) throw new Error('Cannot read Android package name');
const pluginSource = fs.readFileSync('native/android/RssAppUpdaterPlugin.java', 'utf8')
  .replace(/^package .*$/m, 'package ' + pkg + ';');
const pluginDir = path.join(root, 'app/src/main/java', ...pkg.split('.'));
fs.mkdirSync(pluginDir, { recursive: true });
fs.writeFileSync(path.join(pluginDir, 'RssAppUpdaterPlugin.java'), pluginSource);

if (!activity.includes('RssAppUpdaterPlugin.class')) {
  if (activityPath.endsWith('.java')) {
    if (!activity.includes('import android.os.Bundle;')) {
      activity = activity.replace(/(package [^\\n]+;\\s*)/, '$1\\nimport android.os.Bundle;\\n');
    }
    activity = activity.replace(/public class MainActivity extends BridgeActivity\\s*\\{\\s*\\}/,
      'public class MainActivity extends BridgeActivity {\\n    @Override\\n    public void onCreate(Bundle savedInstanceState) {\\n        registerPlugin(RssAppUpdaterPlugin.class);\\n        super.onCreate(savedInstanceState);\\n    }\\n}');
    if (!activity.includes('RssAppUpdaterPlugin.class')) throw new Error('Could not register updater in Java MainActivity');
  } else {
    if (!activity.includes('import android.os.Bundle')) activity = activity.replace(/(package [^\\n]+\\n)/, '$1\\nimport android.os.Bundle\\n');
    activity = activity.replace(/class MainActivity\\s*:\\s*BridgeActivity\\s*\\(\\s*\\)/,
      'class MainActivity : BridgeActivity() {\\n    override fun onCreate(savedInstanceState: Bundle?) {\\n        registerPlugin(RssAppUpdaterPlugin::class.java)\\n        super.onCreate(savedInstanceState)\\n    }\\n}');
    if (!activity.includes('RssAppUpdaterPlugin::class.java')) throw new Error('Could not register updater in Kotlin MainActivity');
  }
}
fs.writeFileSync(activityPath, activity);

const manifestPath = path.join(root, 'app/src/main/AndroidManifest.xml');
let manifest = fs.readFileSync(manifestPath, 'utf8');
if (!manifest.includes('android.permission.INTERNET')) {
  manifest = manifest.replace('<application', '<uses-permission android:name="android.permission.INTERNET" />\\n    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />\\n    <application');
}
if (!manifest.includes('.fileprovider')) {
  const provider = '\\n        <provider\\n            android:name="androidx.core.content.FileProvider"\\n            android:authorities="\\${applicationId}.fileprovider"\\n            android:exported="false"\\n            android:grantUriPermissions="true">\\n            <meta-data\\n                android:name="android.support.FILE_PROVIDER_PATHS"\\n                android:resource="@xml/rss_update_paths" />\\n        </provider>\\n';
  manifest = manifest.replace('</application>', provider + '    </application>');
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
  gradle = gradle.replace(/versionName\\s+"[^"]+"/, 'versionName "1.0.\\${rssBuildVersionCode}"');
}
if (!gradle.includes('rssPersistentReleaseSigning')) {
  const signing = `
    signingConfigs {
        release {
            def rssStoreFile = System.getenv("RSS_ANDROID_KEYSTORE_FILE")
            def rssStorePassword = System.getenv("RSS_ANDROID_STORE_PASSWORD")
            def rssKeyAlias = System.getenv("RSS_ANDROID_KEY_ALIAS")
            def rssKeyPassword = System.getenv("RSS_ANDROID_KEY_PASSWORD")
            if (!rssStoreFile || !rssStorePassword || !rssKeyAlias || !rssKeyPassword) {
                throw new GradleException("Persistent Android release signing secrets are required")
            }
            storeFile file(rssStoreFile)
            storePassword rssStorePassword
            keyAlias rssKeyAlias
            keyPassword rssKeyPassword
        }
    }
    ext.rssPersistentReleaseSigning = true
`;
  if (!gradle.includes('buildTypes {')) throw new Error('Generated Gradle file has no buildTypes block');
  gradle = gradle.replace('buildTypes {', signing + '\\n    buildTypes {');
  const releaseIndex = gradle.indexOf('release {', gradle.indexOf('buildTypes {'));
  if (releaseIndex < 0) throw new Error('Generated Gradle file has no release build type');
  const insertAt = releaseIndex + 'release {'.length;
  gradle = gradle.slice(0, insertAt) + '\\n            signingConfig signingConfigs.release' + gradle.slice(insertAt);
}
fs.writeFileSync(gradlePath, gradle);
console.log('Registered RSS native updater, installer provider, version and persistent release signing.');
