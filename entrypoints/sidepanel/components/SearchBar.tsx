import { useState, useEffect, useRef } from 'react';
import type { SearchResult, ChatSession } from '~/utils/types';
import SessionList from './SessionList';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClose: () => void;
  results: SearchResult[];
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
}

export default function SearchBar({ onSearch, onClose, results, sessions, activeSessionId, onSelectSession }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const debounceTimerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);

    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      onSearch(value);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const highlightText = (text: string, query: string): JSX.Element => {
    if (!query.trim()) {
      return <span>{text}</span>;
    }

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) {
      return <span>{text}</span>;
    }

    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);

    return (
      <span>
        {before}
        <mark className="bg-yellow-200">{match}</mark>
        {highlightText(after, query)}
      </span>
    );
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateContent = (content: string, maxLength: number = 100): string => {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="absolute top-0 left-0 right-0 bottom-0 bg-white z-50 flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="搜索历史消息..."
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={onClose}
          className="shrink-0 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          aria-label="关闭搜索"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {query.trim() && results.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No results found</p>
        )}
        
        {query.trim() && results.length > 0 && (
          <div className="space-y-2">
            {results.map((result, idx) => (
              <div
                key={`${result.sessionId}-${result.matchIndex}-${idx}`}
                className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onSelectSession(result.sessionId)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">
                    {formatDate(result.sessionCreatedAt)}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                    {result.message.role === 'user' ? '用户' : 'AI'}
                  </span>
                </div>
                <div className="text-sm text-gray-700">
                  {highlightText(truncateContent(result.message.content), query)}
                </div>
              </div>
            ))}
          </div>
        )}

        {!query.trim() && (
          <SessionList
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelect={onSelectSession}
          />
        )}
      </div>
    </div>
  );
}
