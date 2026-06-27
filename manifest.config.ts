import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  description: "Reads webpage content using OpenAI compatible TTS service",
  icons: {
    48: "public/logo.png"
  },
  action: {
    default_icon: {
      48: "public/logo.png"
    },
    default_popup: 'src/popup/index.html'
  },
  background: {
    service_worker: "background.js"
  },
  permissions: [
    "activeTab",
    "storage",
    "scripting",
    "offscreen",
    "contextMenus"
  ],
  host_permissions: [
    "http://localhost:8000/*",
    "http://*/*",
    "https://*/*"
  ],
})
