import { fakeBrowser } from '@webext-core/fake-browser';

// @ts-expect-error - Mock browser global for tests
globalThis.browser = fakeBrowser;
