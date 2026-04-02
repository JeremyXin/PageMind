# Learnings - Webpage Summary Extension

## Task 2: Core Types and Zod Schemas

### Date: 2026-03-30

### Key Decisions

1. **Type Definition Strategy**
   - Created explicit TypeScript interfaces in `types.ts` for better readability and IDE support
   - Used `z.infer<typeof Schema>` pattern in `schemas.ts` to ensure runtime/compile-time consistency
   - Exported both type definitions and inferred types for flexibility

2. **Zod Schema Design**
   - Used `.describe()` on schema fields for OpenAI structured outputs compatibility
   - Created separate `ViewpointSchema` for nested object validation
   - Added `SummaryResultJsonSchema` constant for direct use with OpenAI's `response_format`

3. **Message Type Design**
   - Used union type (`type MessageType = 'A' | 'B' | ...`) instead of enum
   - More idiomatic for TypeScript string literals
   - Better tree-shaking and no runtime overhead

### Testing Approach

- **TDD Process**: Tests written first (RED), then implementations (GREEN)
- **Coverage**:
  - Valid data parsing (all fields, empty arrays, single items)
  - Invalid data rejection (wrong types, missing fields, null/undefined)
  - Type inference verification
  - Interface implementation tests

### Issues Encountered

1. **Zod Version Issue**
   - Zod 3.25.0 was installed but had no pre-built dist files
   - Solution: Downgraded to zod@3.23.8 which has proper distribution
   - Note: Should pin zod version in package.json to avoid this

### Patterns Established

```typescript
// Schema + Type pattern
export const MySchema = z.object({...});
export type MyType = z.infer<typeof MySchema>;

// Error response pattern (no custom Error classes)
export interface ErrorResponse {
  code: string;
  message: string;
}
```

### Files Created

- `utils/types.ts` - Core TypeScript type definitions
- `utils/schemas.ts` - Zod schemas with OpenAI compatibility
- `utils/schemas.test.ts` - Comprehensive test suite (25 tests)

## Task 6: Options Page UI (2026-03-30)

### Implementation Details
- Created comprehensive Options page with API Key, Base URL, and Model management
- Used Tailwind CSS with consistent gray color palette and blue/green accent buttons
- Implemented password field with show/hide toggle for API Key security
- Added test connection feature that validates API key by calling `/models` endpoint
- Integrated with utils/storage.ts for persistence using browser.storage.local API

### UI/UX Features
- Form validation: Test Connection button disabled until API key is entered
- Loading states: "Saving..." and "Testing..." button text during async operations
- Toast notifications: Success messages auto-dismiss after 3 seconds
- Error handling: Displays meaningful error messages from API failures
- Security notice: Added footer text explaining local-only storage

### Design System Patterns
- Using Tailwind utility classes for spacing (px-4, py-2, gap-4, space-y-6)
- Color scheme: gray-50 background, white card, gray-700 labels, blue-600/green-600 buttons
- Form inputs: border-gray-300 with focus:ring-2 focus:ring-blue-500
- Responsive: max-w-2xl container with mx-auto centering
- Consistent button pattern: disabled:bg-gray-400 disabled:cursor-not-allowed

### Technical Notes
- ExtensionSettings type imported from utils/types.ts (avoid duplicate export from storage.ts)
- Build warns about duplicate ExtensionSettings export but uses types.ts correctly
- Options page successfully included in build output as options.html
- Uses React hooks: useState for form state, useEffect for loading saved settings


## Task 5: Readability.js Content Extraction (Completed)

### Implementation Approach
- **TDD Workflow**: Followed RED-GREEN-REFACTOR cycle
  - RED: Wrote 5 test cases using JSDOM before implementation
  - GREEN: Implemented `extractContent` function with Readability.js
  - REFACTOR: All tests passed (50/50 tests across entire project)

### Key Technical Decisions
1. **DOM Cloning Strategy**:
   - Used `document.cloneNode(true)` to avoid modifying original page DOM
   - Critical for preserving page state and preventing side effects
   - Test validates original document remains unchanged

2. **Content Validation**:
   - MIN_CONTENT_LENGTH = 100 characters threshold
   - Prevents extraction of trivial content (navigation, footers)
   - Returns null for both Readability failures and too-short content

3. **Language Detection**:
   - Extracts `lang` attribute from `<html>` element
   - Returns `undefined` if not present (graceful handling)
   - Supports internationalization for future summarization

4. **Message Handling in Content Script**:
   - Listens for `EXTRACT_CONTENT` message from Service Worker
   - Returns structured `MessageResponse<ExtractedContent>` with success/error
   - Two error codes: `EXTRACTION_FAILED` (null result), `EXTRACTION_ERROR` (exception)

### Testing Strategy
- **JSDOM for DOM Mocking**: Simulates browser environment in Node.js tests
- **5 Test Scenarios**:
  1. Valid article extraction with all fields
  2. Non-article page (Readability returns null)
  3. Too-short content (< 100 chars)
  4. Missing lang attribute handling
  5. Original document immutability

### Dependencies Added
- `jsdom@29.0.1` (dev): DOM implementation for testing
- `@types/jsdom@28.0.1` (dev): TypeScript types

### Files Modified
- **Created**: `utils/extractor.ts` (29 lines)
- **Created**: `utils/extractor.test.ts` (119 lines)
- **Modified**: `entrypoints/content.ts` (added message listener)
- **Created**: Evidence files for 3 QA scenarios

### Integration Points
- Depends on: `utils/types.ts` (ExtractedContent, MessageType)
- Depends on: `@mozilla/readability` (already installed)
- Blocks: Task 9 (Service Worker integration)

### Performance Considerations
- `cloneNode(true)` creates deep copy (memory cost)
- Readability.js is synchronous (may block on large DOMs)
- Content extraction happens only on explicit message (not auto-triggered)

### Future Enhancements (Not Implemented)
- PDF extraction (planned for separate task)
- YouTube transcript extraction (planned for separate task)
- Twitter thread extraction (planned for separate task)
- Auto-extraction on page load (intentionally avoided per requirements)

## Task 7: Message Passing Layer and Service Worker (Completed - 2026-03-30)

### Implementation Approach
- **TDD Workflow**: Followed RED-GREEN-REFACTOR cycle
  - RED: Wrote comprehensive test suite (11 tests) in `messaging/messages.test.ts`
  - GREEN: Implemented `messaging/sender.ts` and updated `entrypoints/background.ts`
  - REFACTOR: All 50 tests passed across entire project

### Architecture Decisions

1. **Message Type Safety**:
   - Reused existing types from `utils/types.ts` (MessageRequest, MessageResponse)
   - No need for separate `messaging/types.ts` - centralized type definitions
   - Generic types enable type-safe payload: `MessageRequest<ExtractedContent>`

2. **Message Sender Utilities** (`messaging/sender.ts`):
   - `sendToContentScript(tabId, message)` - Side Panel → Content Script
   - `sendToBackground(message)` - Side Panel → Service Worker
   - Uses WXT's `browser` API (cross-browser compatibility layer)
   - Returns typed Promise<MessageResponse<T>> for type safety

3. **Service Worker Implementation** (`entrypoints/background.ts`):
   - **Message Routing**: Listens for `SUMMARIZE` messages via `chrome.runtime.onMessage`
   - **Keep-Alive Strategy**: `setInterval` pings `chrome.runtime.getPlatformInfo()` every 20s
   - **Side Panel Registration**: `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`
   - **Error Handling**: Catches provider errors and returns structured ErrorResponse
   - **Mock Implementation**: Returns placeholder SummaryResult (actual provider in Task 9)

4. **Message Handler Pattern**:
   ```typescript
   chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
     if (message.type === 'SUMMARIZE') {
       handleSummarizeMessage(message)
         .then(sendResponse)
         .catch((error) => sendResponse({ success: false, error: {...} }));
       return true; // Indicates async response
     }
     return false; // Unknown message type
   });
   ```

### Testing Strategy

1. **Type Safety Tests**:
   - Validates MessageRequest/MessageResponse structure
   - Tests payload type inference (ExtractedContent, SummaryResult)
   - Verifies error response format (ErrorResponse type)

2. **Message Sender Tests**:
   - Mocks `fakeBrowser.tabs.sendMessage` and `fakeBrowser.runtime.sendMessage`
   - Validates correct parameters passed to Chrome APIs
   - Tests error propagation from Chrome API failures

3. **Service Worker Routing Tests**:
   - Simulates message handler behavior with mocked sendResponse
   - Tests successful SUMMARIZE message routing
   - Tests error handling when provider throws exception
   - Tests return value (true for handled, false for unknown)

### Technical Notes

1. **Chrome API Usage**:
   - `chrome.runtime.sendMessage()` - For Side Panel → Service Worker
   - `chrome.tabs.sendMessage(tabId, message)` - For Side Panel → Content Script
   - `chrome.runtime.onMessage.addListener()` - Service Worker message listener
   - `chrome.sidePanel.setPanelBehavior()` - Configures side panel behavior

2. **Keep-Alive Strategy**:
   - Service Workers can be terminated by Chrome after 30 seconds of inactivity
   - Periodic `chrome.runtime.getPlatformInfo()` calls prevent termination
   - 20-second interval chosen to provide buffer before 30-second timeout
   - Catches errors silently (`.catch(() => {})`) to avoid logging noise

3. **API Key Validation**:
   - Background script reads settings from storage using `getSettings()`
   - Returns `NO_API_KEY` error if apiKey is empty or missing
   - Prevents unnecessary API calls when not configured

### Files Created/Modified

- **Created**: `messaging/messages.test.ts` (11 tests, 265 lines)
- **Created**: `messaging/sender.ts` (13 lines)
- **Modified**: `entrypoints/background.ts` (88 lines)
- **Evidence**: 4 QA scenario outputs captured

### Test Results
- **All Tests Pass**: 50/50 tests (4 test files)
- **QA Evidence**:
  - `task-7-all-tests.txt` - Full test suite results
  - `task-7-sw-route.txt` - Service Worker routing test
  - `task-7-sw-error.txt` - Error handling test
  - `task-7-message-sender.txt` - Message sender utility tests (4 tests)

### Integration Points
- **Depends on**: Task 2 (types.ts), Task 3 (storage.ts)
- **Blocks**: Task 8 (Side Panel UI), Task 9 (OpenAI Provider integration)
- **Used by**: Side Panel (future) sends messages via sender utilities
- **Used by**: Content Script (Task 5) receives messages via `chrome.tabs.sendMessage`

### Known Limitations (By Design)

1. **No Streaming Support**: 
   - Messages use single request-response pattern
   - Streaming will be handled separately if needed

2. **No Message Queue**:
   - Simple request-response, no buffering or queueing
   - Sufficient for current summarization use case

3. **No Port-based Connections**:
   - Uses `sendMessage` API (short-lived connections)
   - Long-lived connections not needed for current scope

4. **No Offscreen Document**:
   - Service Worker runs directly, no offscreen document needed
   - Simplifies architecture for current requirements

### Patterns Established

```typescript
// Message sender pattern
export async function sendToBackground<T = unknown>(
  message: MessageRequest
): Promise<MessageResponse<T>> {
  return browser.runtime.sendMessage(message);
}

// Service Worker handler pattern
async function handleSummarizeMessage(
  message: MessageRequest<ExtractedContent>
): Promise<MessageResponse<SummaryResult>> {
  try {
    const settings = await getSettings();
    // Process message...
    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      error: { code: 'ERROR_CODE', message: error.message } 
    };
  }
}
```

### Performance Considerations
- Keep-alive interval (20s) has minimal CPU/memory impact
- Message passing is async, non-blocking
- Service Worker remains resident in memory during active use
- No message buffering means no memory accumulation

### Security Considerations
- Service Worker validates API key presence before processing
- No sensitive data logged to console
- Error messages sanitized (no API keys exposed)
- Storage API uses local storage (not synced across devices)
## Scope fidelity check (2026-03-30)
- Scope creep detected: popup entrypoint (App.tsx/style.css) not in plan deliverables.
- LSP diagnostics unavailable (typescript-language-server not installed), so verification could not be completed.
