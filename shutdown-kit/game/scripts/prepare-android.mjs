/**
 * Generates / updates the Capacitor Android project from the static export.
 * - `cap add android` if `android/` doesn't exist yet (it is generated, not committed)
 * - locks the main activity to landscape
 * - declares mic + vibrate permissions (Capacitor's WebChromeClient requests RECORD_AUDIO at runtime for getUserMedia)
 * - installs the SHUTDOWN adaptive launcher icon (vector, no PNGs)
 * - `cap sync android`
 */
import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const run = (cmd) => execSync(cmd, { stdio: 'inherit' })

if (!existsSync('out/index.html')) {
  console.error('out/ is missing. Run `pnpm build` first.')
  process.exit(1)
}

if (!existsSync('android')) run('npx cap add android')

const manifestPath = 'android/app/src/main/AndroidManifest.xml'
let manifest = readFileSync(manifestPath, 'utf8')

if (!manifest.includes('android:screenOrientation')) {
  manifest = manifest.replace(/<activity\b/, '<activity\n            android:screenOrientation="sensorLandscape"')
}

const permissions = [
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS',
  'android.permission.VIBRATE',
]
for (const p of permissions) {
  if (!manifest.includes(`"${p}"`)) {
    manifest = manifest.replace('</manifest>', `    <uses-permission android:name="${p}" />\n</manifest>`)
  }
}
writeFileSync(manifestPath, manifest)

const res = 'android/app/src/main/res'
const icons = [
  ['shutdown_foreground.xml', 'drawable/shutdown_foreground.xml'],
  ['shutdown_colors.xml', 'values/shutdown_colors.xml'],
  ['ic_launcher.xml', 'mipmap-anydpi-v26/ic_launcher.xml'],
  ['ic_launcher.xml', 'mipmap-anydpi-v26/ic_launcher_round.xml'],
]
for (const [from, to] of icons) {
  const target = join(res, to)
  mkdirSync(dirname(target), { recursive: true })
  copyFileSync(join('resources/android', from), target)
}

run('npx cap sync android')
