import { useState, useRef, KeyboardEvent, FormEvent } from 'react';

const SLASH_COMMANDS = [
  { name: 'summarize', description: '总结当前页面内容', icon: '📄' },
  { name: 'translate', description: '翻译页面内容', icon: '🌐' },
  { name: 'rewrite', description: '改写内容', icon: '✏️' },
  { name: 'shorter', description: '缩短内容', icon: '📉' },
  { name: 'longer', description: '扩展内容', icon: '📈' },
  { name: 'eli5', description: '简单解释', icon: '🧒' },
  { name: 'pros-cons', description: '优缺点分析', icon: '⚖️' },
  { name: 'actions', description: '提取行动项', icon: '✅' },
  { name: 'clear', description: '清空对话', icon: '🗑️' },
  { name: 'new', description: '新建对话', icon: '🆕' },
  { name: 'help', description: '显示帮助', icon: '❓' }
] as const;

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  onCommand?: (commandName: string) => void;
  isSummarizing?: boolean;
}

export default function ChatInput({ onSend, disabled, onCommand, isSummarizing }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [showCommandPopup, setShowCommandPopup] = useState(false);
  const [commandFilter, setCommandFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = (e: FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const newValue = target.value;
    setValue(newValue);
    
    if (newValue.startsWith('/') && newValue.length >= 1) {
      const filter = newValue.slice(1);
      setCommandFilter(filter);
      setShowCommandPopup(true);
      setSelectedIndex(0);
    } else {
      setShowCommandPopup(false);
      setCommandFilter('');
    }
    
    target.style.height = 'auto';
    const newHeight = Math.min(target.scrollHeight, 120);
    target.style.height = `${newHeight}px`;
  };

  const filteredCommands = SLASH_COMMANDS.filter(cmd =>
    cmd.name.toLowerCase().includes(commandFilter.toLowerCase())
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommandPopup && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const availableCommands = filteredCommands.filter((_, idx) => {
            const isDisabled = isSummarizing && filteredCommands[idx].name === 'summarize';
            return !isDisabled;
          });
          if (availableCommands.length === 0) return prev;
          return (prev + 1) % filteredCommands.length;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const availableCommands = filteredCommands.filter((_, idx) => {
            const isDisabled = isSummarizing && filteredCommands[idx].name === 'summarize';
            return !isDisabled;
          });
          if (availableCommands.length === 0) return prev;
          return (prev - 1 + filteredCommands.length) % filteredCommands.length;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedCommand = filteredCommands[selectedIndex];
        const isDisabled = isSummarizing && selectedCommand.name === 'summarize';
        if (selectedCommand && !isDisabled && onCommand) {
          onCommand(selectedCommand.name);
          setValue('');
          setShowCommandPopup(false);
          setCommandFilter('');
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
          }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowCommandPopup(false);
        setCommandFilter('');
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmedValue = value.trim();
    if (trimmedValue && !disabled) {
      onSend(trimmedValue);
      setValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const isDisabled = disabled || !value.trim();

  return (
    <div className="flex gap-2 items-end relative">
      {showCommandPopup && filteredCommands.length > 0 && (
        <div
          role="listbox"
          className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-300 rounded-md shadow-lg overflow-hidden"
          style={{ zIndex: 50 }}
        >
          {filteredCommands.map((cmd, idx) => {
            const isCommandDisabled = isSummarizing && cmd.name === 'summarize';
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={cmd.name}
                role="option"
                aria-selected={isSelected}
                aria-disabled={isCommandDisabled}
                className={`px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                  isSelected && !isCommandDisabled
                    ? 'bg-blue-100'
                    : isCommandDisabled
                    ? 'bg-gray-100 opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => {
                  if (!isCommandDisabled && onCommand) {
                    onCommand(cmd.name);
                    setValue('');
                    setShowCommandPopup(false);
                    setCommandFilter('');
                    if (textareaRef.current) {
                      textareaRef.current.style.height = 'auto';
                    }
                  }
                }}
              >
                <span className="text-lg">{cmd.icon}</span>
                <span className="text-sm font-medium">/{cmd.name}</span>
                <span className="text-xs text-gray-500 ml-2">— {cmd.description}</span>
              </div>
            );
          })}
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
        placeholder="输入消息..."
        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-y-auto disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isDisabled}
        className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-md transition-colors ${
          isDisabled
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
        aria-label="发送消息"
      >
        <svg
          className={`w-5 h-5 ${isDisabled ? 'text-gray-500' : 'text-white'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14 5l7 7m0 0l-7 7m7-7H3"
          />
        </svg>
      </button>
    </div>
  );
}
