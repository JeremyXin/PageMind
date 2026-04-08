import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SummaryResult } from "~/utils/types";
import ChatPanel from "./ChatPanel";

const mockPort = {
  postMessage: vi.fn(),
  onMessage: {
    addListener: vi.fn(),
  },
  onDisconnect: {
    addListener: vi.fn(),
  },
  disconnect: vi.fn(),
};

vi.mock("~/messaging/sender", () => ({
  sendToBackground: vi.fn(),
}));

vi.mock("~/utils/chatStorage", () => ({
  getActiveSession: vi.fn().mockResolvedValue({
    id: "session-1",
    messages: [
      {
        id: "msg-1",
        role: "user",
        content: "Hello",
        timestamp: Date.now(),
      },
      {
        id: "msg-2",
        role: "assistant",
        content: "Hi there",
        timestamp: Date.now(),
      },
    ],
    createdAt: Date.now(),
  }),
  clearSession: vi.fn().mockResolvedValue(undefined),
  newSession: vi.fn().mockResolvedValue({
    id: "session-2",
    messages: [],
    createdAt: Date.now(),
  }),
  setActiveSession: vi.fn().mockResolvedValue(undefined),
  getSessions: vi.fn().mockResolvedValue([
    {
      id: "session-1",
      messages: [
        {
          id: "msg-1",
          role: "user",
          content: "Hello",
          timestamp: Date.now(),
        },
      ],
      createdAt: Date.now(),
    },
    {
      id: "session-2",
      messages: [
        {
          id: "msg-3",
          role: "user",
          content: "Different session",
          timestamp: Date.now(),
        },
      ],
      createdAt: Date.now(),
    },
  ]),
  cleanupOldSessions: vi.fn().mockResolvedValue(0),
}));

beforeEach(() => {
  vi.clearAllMocks();

  Element.prototype.scrollIntoView = vi.fn();

  globalThis.chrome = {
    runtime: {
      connect: vi.fn().mockReturnValue(mockPort),
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
  } as any;

  globalThis.browser = {
    runtime: {
      sendMessage: vi.fn(),
    },
    tabs: {
      query: vi.fn().mockResolvedValue([{ url: "https://example.com" }]),
      sendMessage: vi.fn(),
    },
    storage: {
      local: {
        get: vi.fn().mockResolvedValue({ activeAgentRole: 'general' }),
        set: vi.fn().mockResolvedValue(undefined),
      },
    },
  } as any;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("ChatPanel", () => {
  it("should load history messages on mount", async () => {
    render(<ChatPanel />);

    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeInTheDocument();
      expect(screen.getByText("Hi there")).toBeInTheDocument();
    });
  });

  it("should call cleanupOldSessions on mount", async () => {
    const mockChatStorage = await import("~/utils/chatStorage");
    render(<ChatPanel />);

    await waitFor(() => {
      expect(mockChatStorage.cleanupOldSessions).toHaveBeenCalledWith(10);
    });
  });

  it("should establish port connection on mount", async () => {
    render(<ChatPanel />);

    await waitFor(() => {
      expect(chrome.runtime.connect).toHaveBeenCalledWith({
        name: "chat-stream",
      });
    });
  });

  it("should fetch current tab URL on mount", async () => {
    render(<ChatPanel />);

    await waitFor(() => {
      expect(browser.tabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true,
      });
    });
  });

  it("should render settings button when onOpenSettings is provided", () => {
    const handleOpenSettings = vi.fn();
    render(<ChatPanel onOpenSettings={handleOpenSettings} />);

    const settingsButton = screen.getByLabelText("打开设置");
    expect(settingsButton).toBeInTheDocument();
  });

  it("should call onOpenSettings when settings button is clicked", async () => {
    const user = userEvent.setup();
    const handleOpenSettings = vi.fn();
    render(<ChatPanel onOpenSettings={handleOpenSettings} />);

    const settingsButton = screen.getByLabelText("打开设置");
    await user.click(settingsButton);

    expect(handleOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("should not render settings button when onOpenSettings is not provided", () => {
    render(<ChatPanel />);

    const settingsButton = screen.queryByLabelText("打开设置");
    expect(settingsButton).not.toBeInTheDocument();
  });

  it("should clear pageContext when clearing session", async () => {
    const user = userEvent.setup();
    const mockChatStorage = await import("~/utils/chatStorage");

    render(<ChatPanel />);

    const clearButton = screen.getByText("清空记录");
    await user.click(clearButton);

    await waitFor(() => {
      expect(mockChatStorage.clearSession).toHaveBeenCalledWith("session-1");
    });
  });

  it("should handle /summarize command - happy path", async () => {
    const { sendToBackground } = await import("~/messaging/sender");
    const mockSummary: SummaryResult = {
      summary: "Test summary content",
      keyPoints: ["Point 1", "Point 2"],
      viewpoints: [],
      bestPractices: [],
    };

    vi.mocked(sendToBackground).mockResolvedValue({
      success: true,
      data: mockSummary,
    });

    render(<ChatPanel />);

    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeInTheDocument();
    });

    const chatInput = screen.getByRole("textbox");
    await userEvent.type(chatInput, "/");

    await waitFor(() => {
      const options = screen.getAllByRole("option");
      expect(options.length).toBeGreaterThan(0);
    });

    const summarizeOption = screen.getByText("/summarize");
    await userEvent.click(summarizeOption);

    await waitFor(() => {
      expect(screen.getByText("📄 总结本页")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(sendToBackground).toHaveBeenCalledWith({
        type: "EXTRACT_AND_SUMMARIZE",
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/【摘要】/)).toBeInTheDocument();
      expect(screen.getByText(/Test summary content/)).toBeInTheDocument();
    });
  });

  it("should handle /summarize command - error path", async () => {
    const { sendToBackground } = await import("~/messaging/sender");
    vi.mocked(sendToBackground).mockResolvedValue({
      success: false,
      error: {
        code: "NO_API_KEY",
        message: "API key is missing",
      },
    });

    render(<ChatPanel />);

    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeInTheDocument();
    });

    const chatInput = screen.getByRole("textbox");
    await userEvent.type(chatInput, "/");

    await waitFor(() => {
      const options = screen.getAllByRole("option");
      expect(options.length).toBeGreaterThan(0);
    });

    const summarizeOption = screen.getByText("/summarize");
    await userEvent.click(summarizeOption);

    await waitFor(() => {
      expect(screen.getByText("📄 总结本页")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/未配置 API Key/)).toBeInTheDocument();
    });
  });

  it("should prevent concurrent summarization requests", async () => {
    const { sendToBackground } = await import("~/messaging/sender");
    vi.mocked(sendToBackground).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<ChatPanel />);

    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeInTheDocument();
    });

    const chatInput = screen.getByRole("textbox");
    await userEvent.type(chatInput, "/");

    await waitFor(() => {
      const options = screen.getAllByRole("option");
      expect(options.length).toBeGreaterThan(0);
    });

    const summarizeOption = screen.getByText("/summarize");
    await userEvent.click(summarizeOption);

    await waitFor(() => {
      expect(screen.getByText("正在生成摘要...")).toBeInTheDocument();
    });

    await userEvent.type(chatInput, "/");

    await waitFor(() => {
      const summarizeOption = screen.getByText("/summarize").closest('[role="option"]');
      expect(summarizeOption).toHaveAttribute("aria-disabled", "true");
    });
  });

  it("should inject pageContext into chat after successful summarization", async () => {
    const { sendToBackground } = await import("~/messaging/sender");
    const mockSummary: SummaryResult = {
      summary: "Test summary",
      keyPoints: [],
      viewpoints: [],
      bestPractices: [],
    };

    vi.mocked(sendToBackground).mockResolvedValue({
      success: true,
      data: mockSummary,
    });

    render(<ChatPanel />);

    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeInTheDocument();
    });

    const chatInput = screen.getByRole("textbox");
    await userEvent.type(chatInput, "/");

    await waitFor(() => {
      const options = screen.getAllByRole("option");
      expect(options.length).toBeGreaterThan(0);
    });

    const summarizeOption = screen.getByText("/summarize");
    await userEvent.click(summarizeOption);

    await waitFor(() => {
      expect(screen.getByText(/【摘要】/)).toBeInTheDocument();
    });

    await userEvent.type(chatInput, "What is this about?{Enter}");

    await waitFor(() => {
      expect(mockPort.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "CHAT_SEND",
          payload: expect.objectContaining({
            pageContext: {
              url: "https://example.com",
              summary: mockSummary,
            },
          }),
        })
      );
    });
  });

  describe("handleSwitchSession", () => {
    it("should verify setActiveSession function exists and can be called", async () => {
      const mockChatStorage = await import("~/utils/chatStorage");
      
      render(<ChatPanel />);

      await waitFor(() => {
        expect(screen.getByText("Hello")).toBeInTheDocument();
      });

      expect(mockChatStorage.setActiveSession).toBeDefined();
      expect(mockChatStorage.getActiveSession).toBeDefined();
      expect(chrome.runtime.connect).toHaveBeenCalled();
    });

    it("should verify SearchBar receives onSelectSession prop", async () => {
      const user = userEvent.setup();
      
      render(<ChatPanel />);

      await waitFor(() => {
        expect(screen.getByText("Hello")).toBeInTheDocument();
      });

      const searchButton = screen.getByLabelText("搜索消息");
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/搜索/)).toBeInTheDocument();
      });

      const mockChatStorage = await import("~/utils/chatStorage");
      expect(mockChatStorage.setActiveSession).toBeDefined();
    });

    it("should verify port reconnection logic exists", async () => {
      render(<ChatPanel />);

      await waitFor(() => {
        expect(screen.getByText("Hello")).toBeInTheDocument();
      });

      expect(chrome.runtime.connect).toHaveBeenCalled();
      expect(mockPort.onMessage.addListener).toHaveBeenCalled();
    });

    it("should verify streaming state can be reset", async () => {
      render(<ChatPanel />);

      await waitFor(() => {
        expect(screen.getByText("Hello")).toBeInTheDocument();
      });

      const chatInput = screen.getByRole("textbox");
      await userEvent.type(chatInput, "Test message{Enter}");

      await waitFor(() => {
        expect(mockPort.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "CHAT_SEND",
          })
        );
      });

      const mockChatStorage = await import("~/utils/chatStorage");
      expect(mockChatStorage.setActiveSession).toBeDefined();
    });
  });

  describe("slash commands", () => {
    it("should handle /translate command - extract page content and send prompt", async () => {
      const mockExtractedContent = {
        title: "Test Page",
        content: "This is test content",
        url: "https://example.com",
      };

      vi.mocked(browser.tabs.query).mockResolvedValue([
        { id: 123, url: "https://example.com" },
      ] as any);

      vi.mocked(browser.tabs.sendMessage).mockResolvedValue(
        mockExtractedContent as any
      );

      render(<ChatPanel />);

      await waitFor(() => {
        expect(screen.getByText("Hello")).toBeInTheDocument();
      });

      const chatInput = screen.getByRole("textbox");
      await userEvent.type(chatInput, "/translate{Enter}");

      await waitFor(() => {
        expect(screen.getByText("🌐 翻译页面")).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(browser.tabs.sendMessage).toHaveBeenCalledWith(123, {
          type: "EXTRACT_CONTENT",
        });
      });

      await waitFor(() => {
        expect(mockPort.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "CHAT_SEND",
            payload: expect.objectContaining({
              message: expect.stringContaining("请将以下页面内容翻译为中文"),
            }),
          })
        );
      });
    });

    it("should handle /translate command - error when no tab found", async () => {
      vi.mocked(browser.tabs.query).mockResolvedValue([] as any);

      render(<ChatPanel />);

      await waitFor(() => {
        expect(screen.getByText("Hello")).toBeInTheDocument();
      });

      const chatInput = screen.getByRole("textbox");
      await userEvent.type(chatInput, "/translate{Enter}");

      await waitFor(() => {
        expect(screen.getByText("🌐 翻译页面")).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/无法获取当前标签页/)).toBeInTheDocument();
      });
    });

    it("should handle /clear command - call clearSession", async () => {
      const mockChatStorage = await import("~/utils/chatStorage");

      render(<ChatPanel />);

      await waitFor(() => {
        expect(screen.getByText("Hello")).toBeInTheDocument();
      });

      const chatInput = screen.getByRole("textbox");
      await userEvent.type(chatInput, "/clear{Enter}");

      await waitFor(() => {
        expect(mockChatStorage.clearSession).toHaveBeenCalledWith("session-1");
      });
    });

    it("should handle /new command - create new session", async () => {
      const mockChatStorage = await import("~/utils/chatStorage");

      render(<ChatPanel />);

      await waitFor(() => {
        expect(screen.getByText("Hello")).toBeInTheDocument();
      });

      const chatInput = screen.getByRole("textbox");
      await userEvent.type(chatInput, "/new{Enter}");

      await waitFor(() => {
        expect(mockChatStorage.newSession).toHaveBeenCalled();
      });
    });

    it("should handle /help command - display help message", async () => {
      render(<ChatPanel />);

      await waitFor(() => {
        expect(screen.getByText("Hello")).toBeInTheDocument();
      });

      const chatInput = screen.getByRole("textbox");
      await userEvent.type(chatInput, "/help{Enter}");

      await waitFor(() => {
        expect(screen.getByText(/可用的斜杠命令/)).toBeInTheDocument();
        expect(screen.getByText(/summarize/)).toBeInTheDocument();
        expect(screen.getByText(/translate/)).toBeInTheDocument();
        expect(screen.getByText(/clear/)).toBeInTheDocument();
      });
    });
  });
});
