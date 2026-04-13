import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatMessage, SummaryResult, ContextMenuActionMessage, SearchResult, ChatSession, AgentRole } from '~/utils/types';
import * as chatStorage from '~/utils/chatStorage';
import ChatMessageComponent from './ChatMessage';
import ChatInput from './ChatInput';
import SearchBar from './SearchBar';
import AgentRoleSelector from './AgentRoleSelector';
import { formatSummaryAsText } from '~/utils/formatSummary';
import { getErrorMessage } from '~/utils/errorMessages';
import { sendToBackground } from '~/messaging/sender';
import { getActiveAgentRole, saveActiveAgentRole } from '~/utils/storage';

interface ChatPanelProps {
  onOpenSettings?: () => void;
}

export default function ChatPanel({ onOpenSettings }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [sessionId, setSessionId] = useState<string>('');
  const [pageContext, setPageContext] = useState<{ url: string; summary: SummaryResult } | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [currentTabUrl, setCurrentTabUrl] = useState<string>('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [agentRole, setAgentRole] = useState<AgentRole>('general');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const streamingContentRef = useRef('');
  const agentRoleRef = useRef<AgentRole>(agentRole);

  const createPortListener = useCallback(() => {
    return (msg: any) => {
      if (msg.type === 'CHAT_STREAM_CHUNK') {
        setStreamingContent((prev) => {
          const next = prev + msg.content;
          streamingContentRef.current = next;
          return next;
        });
      } else if (msg.type === 'CHAT_STREAM_END') {
        const finalContent = streamingContentRef.current;
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: finalContent,
            timestamp: Date.now(),
            agentRole: agentRoleRef.current,
          },
        ]);
        setStreamingContent('');
        streamingContentRef.current = '';
        setIsStreaming(false);
      } else if (msg.type === 'CHAT_STREAM_ERROR') {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: msg.error?.message || '发生错误',
            timestamp: Date.now(),
            agentRole: agentRoleRef.current,
          },
        ]);
        setStreamingContent('');
        streamingContentRef.current = '';
        setIsStreaming(false);
      }
    };
  }, []);

  const reconnectPort = useCallback(() => {
    if (portRef.current) {
      portRef.current.disconnect();
    }

    const port = chrome.runtime.connect({ name: 'chat-stream' });
    portRef.current = port;
    port.onMessage.addListener(createPortListener());
  }, [createPortListener]);

  useEffect(() => {
    const initSession = async () => {
      await chatStorage.cleanupOldSessions(10);
      const session = await chatStorage.getActiveSession();
      if (session) {
        setMessages(session.messages || []);
        setSessionId(session.id);
      }
    };
    initSession();

    const port = chrome.runtime.connect({ name: 'chat-stream' });
    portRef.current = port;
    port.onMessage.addListener(createPortListener());

    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]?.url) {
        setCurrentTabUrl(tabs[0].url);
      }
    });

    return () => {
      port.disconnect();
    };
  }, [createPortListener]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  useEffect(() => {
    const loadRole = async () => {
      const role = await getActiveAgentRole();
      setAgentRole(role);
      agentRoleRef.current = role;
    };
    loadRole();
  }, []);

  const handleRoleChange = async (role: AgentRole) => {
    setAgentRole(role);
    agentRoleRef.current = role;
    await saveActiveAgentRole(role);
  };

  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.type === 'CONTEXT_MENU_ACTION') {
        const contextMsg = message as ContextMenuActionMessage;
        let prompt = '';
        
        switch (contextMsg.action) {
          case 'explain':
            prompt = `Explain the following text in detail:\n\n"${contextMsg.selectedText}"`;
            break;
          case 'translate':
            prompt = `Translate the following text to Chinese:\n\n"${contextMsg.selectedText}"`;
            break;
          case 'rewrite':
            prompt = `Rewrite and improve the following text while preserving its meaning:\n\n"${contextMsg.selectedText}"`;
            break;
        }
        
        if (prompt) {
          handleSend(prompt);
        }
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [sessionId, pageContext]);

  useEffect(() => {
    if (showSearch) {
      const loadSessions = async () => {
        const allSessions = await chatStorage.getSessions();
        setSessions(allSessions);
      };
      loadSessions();
    }
  }, [showSearch]);

  const handleSearch = async (query: string) => {
    const results = await chatStorage.searchMessages(query);
    setSearchResults(results);
  };

  const handleSlashCommand = async (commandName: string) => {
    if (commandName === 'summarize') {
      if (isSummarizing) {
        return;
      }

      setIsSummarizing(true);

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: '📄 总结本页',
        timestamp: Date.now(),
      };

      const loadingMessage: ChatMessage = {
        id: 'summarize-loading',
        role: 'assistant',
        content: '正在生成摘要...',
        timestamp: Date.now(),
        agentRole,
      };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);

      try {
        const response = await sendToBackground<SummaryResult>({
          type: 'EXTRACT_AND_SUMMARIZE',
        });

        if (response.success && response.data) {
          const formattedSummary = formatSummaryAsText(response.data);

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === 'summarize-loading'
                ? { ...msg, content: formattedSummary }
                : msg
            )
          );

          setPageContext({
            url: currentTabUrl,
            summary: response.data,
          });
        } else {
          const errorInfo = getErrorMessage(response.error?.code || 'UNKNOWN');

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === 'summarize-loading'
                ? { ...msg, content: `❌ ${errorInfo.title}\n\n${errorInfo.message}` }
                : msg
            )
          );
        }
      } catch (error) {
        const errorInfo = getErrorMessage('UNKNOWN');

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === 'summarize-loading'
              ? { ...msg, content: `❌ ${errorInfo.title}\n\n${errorInfo.message}` }
              : msg
          )
        );
      } finally {
        setIsSummarizing(false);
      }
    } else if (commandName === 'translate') {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: '🌐 翻译页面',
        timestamp: Date.now(),
      };

      const loadingMessage: ChatMessage = {
        id: 'translate-loading',
        role: 'assistant',
        content: '正在提取页面内容...',
        timestamp: Date.now(),
        agentRole,
      };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);

      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.id) {
          throw new Error('无法获取当前标签页');
        }

        const response = await browser.tabs.sendMessage(tabs[0].id, { type: 'EXTRACT_CONTENT' });
        
        setMessages((prev) => prev.filter(msg => msg.id !== 'translate-loading'));

        const prompt = `请将以下页面内容翻译为中文：\n\n${response.title}\n\n${response.content}`;
        handleSend(prompt);
      } catch (error) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === 'translate-loading'
              ? { ...msg, content: `❌ 提取页面内容失败\n\n${error instanceof Error ? error.message : '未知错误'}` }
              : msg
          )
        );
      }
    } else if (commandName === 'rewrite') {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: '✍️ 改写页面',
        timestamp: Date.now(),
      };

      const loadingMessage: ChatMessage = {
        id: 'rewrite-loading',
        role: 'assistant',
        content: '正在提取页面内容...',
        timestamp: Date.now(),
        agentRole,
      };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);

      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.id) {
          throw new Error('无法获取当前标签页');
        }

        const response = await browser.tabs.sendMessage(tabs[0].id, { type: 'EXTRACT_CONTENT' });
        
        setMessages((prev) => prev.filter(msg => msg.id !== 'rewrite-loading'));

        const prompt = `请改写以下内容，使其更清晰易读，同时保持原意：\n\n${response.title}\n\n${response.content}`;
        handleSend(prompt);
      } catch (error) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === 'rewrite-loading'
              ? { ...msg, content: `❌ 提取页面内容失败\n\n${error instanceof Error ? error.message : '未知错误'}` }
              : msg
          )
        );
      }
    } else if (commandName === 'shorter') {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: '📉 精简页面',
        timestamp: Date.now(),
      };

      const loadingMessage: ChatMessage = {
        id: 'shorter-loading',
        role: 'assistant',
        content: '正在提取页面内容...',
        timestamp: Date.now(),
        agentRole,
      };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);

      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.id) {
          throw new Error('无法获取当前标签页');
        }

        const response = await browser.tabs.sendMessage(tabs[0].id, { type: 'EXTRACT_CONTENT' });
        
        setMessages((prev) => prev.filter(msg => msg.id !== 'shorter-loading'));

        const prompt = `请将以下内容精简，只保留核心要点：\n\n${response.title}\n\n${response.content}`;
        handleSend(prompt);
      } catch (error) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === 'shorter-loading'
              ? { ...msg, content: `❌ 提取页面内容失败\n\n${error instanceof Error ? error.message : '未知错误'}` }
              : msg
          )
        );
      }
    } else if (commandName === 'longer') {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: '📈 扩写页面',
        timestamp: Date.now(),
      };

      const loadingMessage: ChatMessage = {
        id: 'longer-loading',
        role: 'assistant',
        content: '正在提取页面内容...',
        timestamp: Date.now(),
        agentRole,
      };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);

      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.id) {
          throw new Error('无法获取当前标签页');
        }

        const response = await browser.tabs.sendMessage(tabs[0].id, { type: 'EXTRACT_CONTENT' });
        
        setMessages((prev) => prev.filter(msg => msg.id !== 'longer-loading'));

        const prompt = `请对以下内容进行扩写，增加详细说明和示例：\n\n${response.title}\n\n${response.content}`;
        handleSend(prompt);
      } catch (error) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === 'longer-loading'
              ? { ...msg, content: `❌ 提取页面内容失败\n\n${error instanceof Error ? error.message : '未知错误'}` }
              : msg
          )
        );
      }
    } else if (commandName === 'eli5') {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: '👶 简单解释',
        timestamp: Date.now(),
      };

      const loadingMessage: ChatMessage = {
        id: 'eli5-loading',
        role: 'assistant',
        content: '正在提取页面内容...',
        timestamp: Date.now(),
        agentRole,
      };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);

      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.id) {
          throw new Error('无法获取当前标签页');
        }

        const response = await browser.tabs.sendMessage(tabs[0].id, { type: 'EXTRACT_CONTENT' });
        
        setMessages((prev) => prev.filter(msg => msg.id !== 'eli5-loading'));

        const prompt = `请用最简单的语言解释以下内容，就像在向一个5岁的孩子解释一样：\n\n${response.title}\n\n${response.content}`;
        handleSend(prompt);
      } catch (error) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === 'eli5-loading'
              ? { ...msg, content: `❌ 提取页面内容失败\n\n${error instanceof Error ? error.message : '未知错误'}` }
              : msg
          )
        );
      }
    } else if (commandName === 'pros-cons') {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: '⚖️ 优缺点分析',
        timestamp: Date.now(),
      };

      const loadingMessage: ChatMessage = {
        id: 'pros-cons-loading',
        role: 'assistant',
        content: '正在提取页面内容...',
        timestamp: Date.now(),
        agentRole,
      };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);

      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.id) {
          throw new Error('无法获取当前标签页');
        }

        const response = await browser.tabs.sendMessage(tabs[0].id, { type: 'EXTRACT_CONTENT' });
        
        setMessages((prev) => prev.filter(msg => msg.id !== 'pros-cons-loading'));

        const prompt = `请分析以下内容，列出其中主要话题或观点的优点和缺点：\n\n${response.title}\n\n${response.content}`;
        handleSend(prompt);
      } catch (error) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === 'pros-cons-loading'
              ? { ...msg, content: `❌ 提取页面内容失败\n\n${error instanceof Error ? error.message : '未知错误'}` }
              : msg
          )
        );
      }
    } else if (commandName === 'actions') {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: '✅ 提取行动事项',
        timestamp: Date.now(),
      };

      const loadingMessage: ChatMessage = {
        id: 'actions-loading',
        role: 'assistant',
        content: '正在提取页面内容...',
        timestamp: Date.now(),
        agentRole,
      };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);

      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.id) {
          throw new Error('无法获取当前标签页');
        }

        const response = await browser.tabs.sendMessage(tabs[0].id, { type: 'EXTRACT_CONTENT' });
        
        setMessages((prev) => prev.filter(msg => msg.id !== 'actions-loading'));

        const prompt = `请从以下内容中提取所有行动事项、待办清单和可执行建议：\n\n${response.title}\n\n${response.content}`;
        handleSend(prompt);
      } catch (error) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === 'actions-loading'
              ? { ...msg, content: `❌ 提取页面内容失败\n\n${error instanceof Error ? error.message : '未知错误'}` }
              : msg
          )
        );
      }
    } else if (commandName === 'clear') {
      handleClearSession();
    } else if (commandName === 'new') {
      handleNewSession();
    } else if (commandName === 'help') {
      const helpMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `📖 可用的斜杠命令：

**页面内容操作：**
/summarize - 总结当前页面
/translate - 翻译页面内容为中文
/rewrite - 改写页面内容，使其更清晰
/shorter - 精简页面内容，只保留要点
/longer - 扩写页面内容，增加详细说明
/eli5 - 用简单语言解释页面内容
/pros-cons - 分析页面内容的优缺点
/actions - 提取页面中的行动事项

**会话管理：**
/clear - 清空当前会话
/new - 开始新会话
/help - 显示此帮助信息`,
        timestamp: Date.now(),
        agentRole,
      };

      setMessages((prev) => [...prev, helpMessage]);
    }
  };

  const handleSend = (text: string) => {
    setIsStreaming(true);
    setStreamingContent('');
    streamingContentRef.current = '';

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      },
    ]);

    portRef.current?.postMessage({
      type: 'CHAT_SEND',
      payload: {
        message: text,
        sessionId,
        pageContext: pageContext,
      },
    });
  };

  const handleClearSession = async () => {
    if (isStreaming) {
      portRef.current?.disconnect();
      reconnectPort();
      setIsStreaming(false);
      setStreamingContent('');
      streamingContentRef.current = '';
    }
    if (sessionId) {
      await chatStorage.clearSession(sessionId);
      setMessages([]);
      setPageContext(null);
    }
  };

  const handleNewSession = async () => {
    if (isStreaming) {
      setIsStreaming(false);
      setStreamingContent('');
      streamingContentRef.current = '';
    }
    const newSession = await chatStorage.newSession();
    setMessages([]);
    setSessionId(newSession.id);
    reconnectPort();
  };

  const handleSwitchSession = async (targetSessionId: string) => {
    await chatStorage.setActiveSession(targetSessionId);
    
    const session = await chatStorage.getActiveSession();
    if (!session) return;

    setMessages(session.messages || []);
    setSessionId(session.id);
    reconnectPort();

    setShowSearch(false);
    setSearchResults([]);
    setIsStreaming(false);
    setStreamingContent('');
  };

  const handleExport = () => {
    if (messages.length === 0) return;

    const formatDate = (timestamp: number) => {
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    };

    const content = messages
      .map((msg) => {
        const roleLabel = msg.role === 'user' ? '[User]' : '[Assistant]';
        const timestamp = formatDate(msg.timestamp);
        return `${roleLabel} ${timestamp}\n${msg.content}`;
      })
      .join('\n\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `chat-export-${dateStr}.txt`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">AI 对话</h3>
        <div className="flex gap-2 items-center">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              aria-label="打开设置"
            >
              ⚙️
            </button>
          )}
          <button
            onClick={() => setShowSearch(true)}
            className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            aria-label="搜索消息"
            title="搜索消息"
          >
            🔍
          </button>
          <button
            onClick={handleExport}
            className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            aria-label="导出对话"
            title="导出对话"
          >
            📥
          </button>
          <AgentRoleSelector value={agentRole} onChange={handleRoleChange} />
          <button
            onClick={handleClearSession}
            className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          >
            清空记录
          </button>
          <button
            onClick={handleNewSession}
            className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          >
            新对话
          </button>
        </div>
      </div>

      {showSearch && (
        <SearchBar
          onSearch={handleSearch}
          onClose={() => {
            setShowSearch(false);
            setSearchResults([]);
          }}
          results={searchResults}
          sessions={sessions}
          activeSessionId={sessionId}
          onSelectSession={handleSwitchSession}
        />
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        {messages.length === 0 && !isStreaming && (
          <p className="text-sm text-gray-400 text-center py-4">
            发送消息开始对话…
          </p>
        )}
        {messages.map((msg) => (
          <ChatMessageComponent key={msg.id} message={msg} />
        ))}
        {isStreaming && streamingContent && (
          <ChatMessageComponent
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamingContent,
              timestamp: Date.now(),
              agentRole,
            }}
            isStreaming={true}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 py-3 border-t border-gray-200 shrink-0">
        <ChatInput 
          onSend={handleSend} 
          disabled={isStreaming} 
          onCommand={handleSlashCommand}
          isSummarizing={isSummarizing}
        />
      </div>
    </div>
  );
}
