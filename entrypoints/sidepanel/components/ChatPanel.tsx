import { useState, useEffect, useRef } from 'react';
import type { ChatMessage, SummaryResult } from '~/utils/types';
import * as chatStorage from '~/utils/chatStorage';
import ChatMessageComponent from './ChatMessage';
import ChatInput from './ChatInput';

interface ChatPanelProps {
  summaryContext?: {
    url: string;
    summary: SummaryResult;
  };
}

export default function ChatPanel({ summaryContext }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [sessionId, setSessionId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const portRef = useRef<chrome.runtime.Port | null>(null);

  useEffect(() => {
    chatStorage.getActiveSession().then((session) => {
      if (session) {
        setMessages(session.messages);
        setSessionId(session.id);
      }
    });

    const port = chrome.runtime.connect({ name: 'chat-stream' });
    portRef.current = port;

    port.onMessage.addListener((msg: any) => {
      if (msg.type === 'CHAT_STREAM_CHUNK') {
        setStreamingContent((prev) => prev + msg.content);
      } else if (msg.type === 'CHAT_STREAM_END') {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: streamingContent,
            timestamp: Date.now(),
          },
        ]);
        setStreamingContent('');
        setIsStreaming(false);
      } else if (msg.type === 'CHAT_STREAM_ERROR') {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: msg.error?.message || '发生错误',
            timestamp: Date.now(),
          },
        ]);
        setStreamingContent('');
        setIsStreaming(false);
      }
    });

    return () => {
      port.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = (text: string) => {
    setIsStreaming(true);
    setStreamingContent('');

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
        pageContext: summaryContext,
      },
    });
  };

  const handleClearSession = async () => {
    if (sessionId) {
      await chatStorage.clearSession(sessionId);
      setMessages([]);
    }
  };

  const handleNewSession = async () => {
    const newSession = await chatStorage.newSession();
    setMessages([]);
    setSessionId(newSession.id);

    if (portRef.current) {
      portRef.current.disconnect();
    }

    const port = chrome.runtime.connect({ name: 'chat-stream' });
    portRef.current = port;

    port.onMessage.addListener((msg: any) => {
      if (msg.type === 'CHAT_STREAM_CHUNK') {
        setStreamingContent((prev) => prev + msg.content);
      } else if (msg.type === 'CHAT_STREAM_END') {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: streamingContent,
            timestamp: Date.now(),
          },
        ]);
        setStreamingContent('');
        setIsStreaming(false);
      } else if (msg.type === 'CHAT_STREAM_ERROR') {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: msg.error?.message || '发生错误',
            timestamp: Date.now(),
          },
        ]);
        setStreamingContent('');
        setIsStreaming(false);
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">AI 对话</h3>
        <div className="flex gap-2">
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
            }}
            isStreaming={true}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 py-3 border-t border-gray-200 shrink-0">
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </div>
    </div>
  );
}
