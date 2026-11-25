# RSS Liquid Flow Pro update manifest

The Android client checks this HTTPS endpoint every 12 hours and when the app starts:

`https://rssapps.net/games/liquid-flow-pro/update.json`

The website deployment must publish a JSON document with this shape (all values are required):

```json
{
  "versionCode": 2,
  "versionName": "1.0.1",
  "apkUrl": "https://rssapps.net/games/liquid-flow-pro/releases/rss-liquid-flow-pro-1.0.1.apk",
  "sha256": "REPLACE_WITH_THE_64_CHARACTER_LOWERCASE_SHA256_OF_THE_APK",
  "notes": "Bug fixes and improvements"
}
```

The APK URL must use HTTPS on `rssapps.net`. The client verifies SHA-256 before handing the package to Android. Android's package installer enforces the installed app's signing identity; every update must use the same signing key and application ID (`com.riyaz.rssliquidflowpro`).

## Installation policy

- Auto Update defaults to ON. The app checks automatically and downloads updates in the background.
- On ordinary devices, Android still requires the customer to approve installation. The app displays a notification after the APK is downloaded and opens the system package installer when approved.
- With Auto Update OFF, the app still checks and notifies, but does not download until the customer chooses Download & install.
- Silent installation is attempted only when Android confirms this app is the Device Owner on a fully managed device. An ordinary app cannot make itself Device Owner.

The manifest and APK hosting path must be deployed on the RSS website before clients can receive production updates. Do not publish a release until a production signing key is configured and backed up securely.
