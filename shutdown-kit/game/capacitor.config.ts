import type { CapacitorConfig } from '@capacitor/cli'

/** Android shell for the static Next.js export in `out/`. Landscape + permissions are applied by `scripts/prepare-android.mjs`. */
const config: CapacitorConfig = {
  appId: 'com.hideogroup.shutdown',
  appName: 'SHUTDOWN',
  webDir: 'out',
  backgroundColor: '#0E0F12',
  android: {
    backgroundColor: '#0E0F12',
    allowMixedContent: false,
  },
}

export default config
