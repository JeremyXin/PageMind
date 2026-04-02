import type { ChatSession } from '~/utils/types';
import { deriveSessionTitle } from '~/utils/sessionTitle';

export interface SessionListProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelect: (sessionId: string) => void;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

export default function SessionList({ sessions, activeSessionId, onSelect }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        暂无历史会话
      </div>
    );
  }

  const sortedSessions = [...sessions].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="space-y-2">
      {sortedSessions.map((session) => {
        const isActive = session.id === activeSessionId;
        const title = deriveSessionTitle(session);
        const messageCount = session.messages.length;
        const dateStr = formatDate(session.createdAt);

        return (
          <button
            key={session.id}
            onClick={() => onSelect(session.id)}
            className={`w-full text-left p-3 border rounded-md hover:bg-gray-50 cursor-pointer transition-colors ${
              isActive
                ? 'bg-blue-50 border-l-4 border-blue-500 border-gray-200'
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-900 truncate">{title}</span>
              <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{dateStr}</span>
            </div>
            <div className="text-xs text-gray-400">
              {messageCount} 条消息
            </div>
          </button>
        );
      })}
    </div>
  );
}
