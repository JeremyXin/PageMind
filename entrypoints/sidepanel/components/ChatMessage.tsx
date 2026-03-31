import type { ChatMessage } from '~/utils/types';

interface ChatMessageProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export default function ChatMessageComponent({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
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
    </div>
  );
}
