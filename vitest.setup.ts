import { fakeBrowser } from '@webext-core/fake-browser';
import '@testing-library/jest-dom/vitest';

// @ts-expect-error - Mock browser global for tests
globalThis.browser = fakeBrowser;
