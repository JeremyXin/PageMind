import { describe, it, expect, beforeEach, vi } from "vitest";
import type { ChatSendPayload } from "../utils/types";

(globalThis as any).defineBackground = vi.fn((fn) => {
  if (typeof fn === "function") fn();
  return {};
});

vi.mock("../utils/storage");
vi.mock("../utils/chatStorage");
vi.mock("../providers/chat");
vi.mock("../providers/openai");

import { getSettings } from "../utils/storage";
import { getActiveSession, addMessage } from "../utils/chatStorage";
import { ChatProvider } from "../providers/chat";

const mockTabs = vi.fn();
(globalThis as any).chrome = {
  ...(globalThis as any).chrome,
  tabs: {
    query: mockTabs,
  },
  runtime: {
    onConnect: {
      addListener: vi.fn(),
    },
    onMessage: {
      addListener: vi.fn(),
    },
    getPlatformInfo: vi.fn().mockResolvedValue({}),
  },
  sidePanel: {
    setPanelBehavior: vi.fn().mockResolvedValue(undefined),
    open: vi.fn().mockResolvedValue(undefined),
  },
  contextMenus: {
    removeAll: vi.fn().mockResolvedValue(undefined),
    create: vi.fn(),
    onClicked: {
      addListener: vi.fn(),
    },
  },
};

describe("background handleChatPort", () => {
  let mockChatProvider: any;
  let mockPort: any;
  let messageListener: any;
  let disconnectListener: any;
  let handleChatPort: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockPort = {
      name: "chat-stream",
      postMessage: vi.fn(),
      onMessage: {
        addListener: vi.fn((fn) => {
          messageListener = fn;
        }),
      },
      onDisconnect: {
        addListener: vi.fn((fn) => {
          disconnectListener = fn;
        }),
      },
    };

    vi.mocked(getSettings).mockResolvedValue({
      apiKey: "test-api-key",
      baseUrl: "https://api.openai.com",
      model: "gpt-4",
    });

    vi.mocked(getActiveSession).mockResolvedValue({
      id: "test-session-id",
      messages: [],
      createdAt: Date.now(),
    });

    vi.mocked(addMessage).mockImplementation(async (sessionId, message) => ({
      ...message,
      id: "generated-id",
    }));

    mockTabs.mockResolvedValue([{ url: "https://example.com", id: 1 }]);

    mockChatProvider = {
      chat: vi.fn(),
    };

    vi.mocked(ChatProvider).mockImplementation(() => mockChatProvider);

    const module = await import("../entrypoints/background");
    handleChatPort = module.handleChatPort;
  });

  it("should send CHAT_STREAM_ERROR when apiKey is empty", async () => {
    vi.mocked(getSettings).mockResolvedValue({
      apiKey: "",
      baseUrl: "https://api.openai.com",
      model: "gpt-4",
    });

    handleChatPort(mockPort);

    await messageListener({
      type: "CHAT_SEND",
      payload: {
        message: "test",
        sessionId: "test-session-id",
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockPort.postMessage).toHaveBeenCalledWith({
      type: "CHAT_STREAM_ERROR",
      error: {
        code: "NO_API_KEY",
        message: "请先在设置中填写 API Key",
      },
    });
  });

  it("should not send anything when message is empty", async () => {
    handleChatPort(mockPort);

    await messageListener({
      type: "CHAT_SEND",
      payload: {
        message: "",
        sessionId: "test-session-id",
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockPort.postMessage).not.toHaveBeenCalled();
  });

  it("should stream chunks and send CHAT_STREAM_END", async () => {
    async function* mockGenerator() {
      yield "Hello";
      yield " ";
      yield "World";
    }

    mockChatProvider.chat.mockReturnValue(mockGenerator());

    handleChatPort(mockPort);

    await messageListener({
      type: "CHAT_SEND",
      payload: {
        message: "test",
        sessionId: "test-session-id",
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const calls = mockPort.postMessage.mock.calls;

    expect(calls[0][0]).toEqual({
      type: "CHAT_STREAM_CHUNK",
      content: "Hello",
    });

    expect(calls[1][0]).toEqual({
      type: "CHAT_STREAM_CHUNK",
      content: " ",
    });

    expect(calls[2][0]).toEqual({
      type: "CHAT_STREAM_CHUNK",
      content: "World",
    });

    expect(calls[3][0]).toEqual({
      type: "CHAT_STREAM_END",
    });

    expect(vi.mocked(addMessage)).toHaveBeenCalledWith(
      "test-session-id",
      expect.objectContaining({
        role: "user",
        content: "test",
      })
    );

    expect(vi.mocked(addMessage)).toHaveBeenCalledWith(
      "test-session-id",
      expect.objectContaining({
        role: "assistant",
        content: "Hello World",
      })
    );
  });

  it("should call abort on disconnect", () => {
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");

    handleChatPort(mockPort);
    disconnectListener();

    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
  });

  it("should cancel previous AbortController on new connection", () => {
    const mockPort2 = {
      name: "chat-stream",
      postMessage: vi.fn(),
      onMessage: { addListener: vi.fn() },
      onDisconnect: { addListener: vi.fn() },
    };

    const abortSpy = vi.spyOn(AbortController.prototype, "abort");

    handleChatPort(mockPort);
    handleChatPort(mockPort2);

    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
  });

  it("should inject page context when URL matches", async () => {
    const mockSummary = {
      summary: "Test summary",
      keyPoints: ["Point 1", "Point 2"],
      viewpoints: [],
      bestPractices: [],
    };

    async function* mockGenerator() {
      yield "Response";
    }

    mockChatProvider.chat.mockReturnValue(mockGenerator());

    handleChatPort(mockPort);

    await messageListener({
      type: "CHAT_SEND",
      payload: {
        message: "test",
        sessionId: "test-session-id",
        pageContext: {
          url: "https://example.com",
          summary: mockSummary,
        },
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockChatProvider.chat).toHaveBeenCalled();
    const calledMessages = mockChatProvider.chat.mock.calls[0][0];
    const systemMessage = calledMessages[0];

    expect(systemMessage.role).toBe("system");
    expect(systemMessage.content).toContain("Test summary");
    expect(systemMessage.content).toContain("Point 1");
    expect(systemMessage.content).toContain("Point 2");
  });

  it("should not inject page context when URL does not match", async () => {
    mockTabs.mockResolvedValue([{ url: "https://different-url.com", id: 1 }]);

    async function* mockGenerator() {
      yield "Response";
    }

    mockChatProvider.chat.mockReturnValue(mockGenerator());

    handleChatPort(mockPort);

    await messageListener({
      type: "CHAT_SEND",
      payload: {
        message: "test",
        sessionId: "test-session-id",
        pageContext: {
          url: "https://example.com",
          summary: {
            summary: "Test summary",
            keyPoints: ["Point 1"],
            viewpoints: [],
            bestPractices: [],
          },
        },
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const calledMessages = mockChatProvider.chat.mock.calls[0][0];
    const systemMessage = calledMessages[0];

    expect(systemMessage.role).toBe("system");
    expect(systemMessage.content).toBe("你是一个有帮助的AI助手。");
    expect(systemMessage.content).not.toContain("Test summary");
  });

  it("should send CHAT_STREAM_ERROR on provider error", async () => {
    async function* mockGenerator() {
      throw new Error("Provider failed");
    }

    mockChatProvider.chat.mockReturnValue(mockGenerator());

    handleChatPort(mockPort);

    await messageListener({
      type: "CHAT_SEND",
      payload: {
        message: "test",
        sessionId: "test-session-id",
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const errorCall = mockPort.postMessage.mock.calls.find(
      (call: any) => call[0].type === "CHAT_STREAM_ERROR"
    );

    expect(errorCall).toBeDefined();
    expect(errorCall[0]).toEqual({
      type: "CHAT_STREAM_ERROR",
      error: {
        code: "CHAT_ERROR",
        message: "Provider failed",
      },
    });
  });

  it("should limit history to last 50 messages", async () => {
    const manyMessages = Array.from({ length: 60 }, (_, i) => ({
      id: `msg-${i}`,
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `Message ${i}`,
      timestamp: Date.now() + i,
    }));

    vi.mocked(getActiveSession).mockResolvedValue({
      id: "test-session-id",
      messages: manyMessages,
      createdAt: Date.now(),
    });

    async function* mockGenerator() {
      yield "Response";
    }

    mockChatProvider.chat.mockReturnValue(mockGenerator());

    handleChatPort(mockPort);

    await messageListener({
      type: "CHAT_SEND",
      payload: {
        message: "test",
        sessionId: "test-session-id",
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const calledMessages = mockChatProvider.chat.mock.calls[0][0];

    expect(calledMessages).toHaveLength(52);
    expect(calledMessages[0].role).toBe("system");
    expect(calledMessages[1].content).toBe("Message 10");
    expect(calledMessages[50].content).toBe("Message 59");
    expect(calledMessages[51].content).toBe("test");
  });
});
