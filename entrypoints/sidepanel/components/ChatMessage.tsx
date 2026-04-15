import type { ChatMessage } from '~/utils/types';
import { ROLE_OPTIONS } from './AgentRoleSelector';

interface ChatMessageProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function ChatMessageComponent({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const roleOption = message.agentRole
    ? ROLE_OPTIONS.find((r) => r.value === message.agentRole)
    : undefined;

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-3`}>
      <div
        className={`max-w-[80%] px-4 py-2 ${
          isUser
            ? 'bg-blue-600 text-white rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl'
            : 'bg-gray-100 text-gray-900 rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl'
        }`}
      >
        <pre className="whitespace-pre-wrap font-sans text-sm">
          {message.content}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
          )}
        </pre>
      </div>
      {!isUser && roleOption && (
        <span className="mt-1 ml-1 text-[10px] text-gray-400">
          {roleOption.emoji} {roleOption.label} · {formatTime(message.timestamp)}
        </span>
      )}
      {!isUser && message.sources && message.sources.length > 0 && (
        <div className="mt-1 ml-1 flex flex-wrap gap-x-2 gap-y-0.5 max-w-[80%]">
          {message.sources.map((source, i) => (
            <a
              key={i}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-blue-500 hover:text-blue-700 hover:underline truncate max-w-[200px]"
              title={source.url}
            >
              📎 {source.title || getHostname(source.url)}
            </a>
          ))}
        </div>
      )}
      {isUser && (
        <span className="mt-1 mr-1 text-[10px] text-gray-400">
          {formatTime(message.timestamp)}
        </span>
      )}
    </div>
  );
}
