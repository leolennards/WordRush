#!/usr/bin/env node
// Copies the signed release APK to public/downloads so the website offers it.
import { copyFileSync, mkdirSync, statSync } from 'node:fs';
const src = 'android/app/build/outputs/apk/release/app-release.apk';
const dest = 'public/downloads/wordskiis-android.apk';
mkdirSync('public/downloads', { recursive: true });
copyFileSync(src, dest);
console.log(`Published ${dest} (${(statSync(dest).size / 1e6).toFixed(1)} MB)`);
