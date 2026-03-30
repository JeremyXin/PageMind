import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    manifest_version: 3,
    name: 'Webpage Summary',
    description: 'AI-powered webpage summary Chrome extension',
    version: '0.0.1',
    permissions: [
      'sidePanel',
      'storage',
      'activeTab',
    ],
    host_permissions: [
      'https://api.openai.com/*',
    ],
    side_panel: {
      default_path: 'sidepanel.html',
    },
  },
});
