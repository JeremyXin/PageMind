import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),

  manifest: {
    manifest_version: 3,
    name: 'PageMind',
    description: 'AI-powered webpage summary Chrome extension',
    version: '0.0.1',
    permissions: [
      'sidePanel',
      'storage',
      'activeTab',
      'scripting',
      'contextMenus',
    ],
    host_permissions: [
      'https://api.openai.com/*',
      'https://*/*',
      'http://localhost/*',
      'http://127.0.0.1/*',
    ],
    side_panel: {
      default_path: 'sidepanel.html',
    },
  },
});
