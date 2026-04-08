import { useState, useRef, useEffect } from 'react';
import type { AgentRole } from '~/utils/types';

interface AgentRoleSelectorProps {
  value: AgentRole;
  onChange: (role: AgentRole) => void;
}

const ROLE_OPTIONS: { value: AgentRole; label: string; emoji: string }[] = [
  { value: 'smart-reader', label: '阅读助手', emoji: '📖' },
  { value: 'general', label: '通用助手', emoji: '🤖' },
  { value: 'analyst', label: '分析师', emoji: '🔍' },
  { value: 'creative', label: '创意助手', emoji: '✨' },
  { value: 'coder', label: '代码助手', emoji: '💻' },
];

export default function AgentRoleSelector({ value, onChange }: AgentRoleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentRole = ROLE_OPTIONS.find((r) => r.value === value) || ROLE_OPTIONS[1];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (role: AgentRole) => {
    onChange(role);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-800 text-gray-100 border border-gray-700 rounded-md hover:bg-gray-700 transition-colors"
        aria-label="选择角色"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="text-base">{currentRole.emoji}</span>
        <span>{currentRole.label}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute top-full left-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg overflow-hidden z-50"
        >
          {ROLE_OPTIONS.map((role) => {
            const isSelected = role.value === value;
            return (
              <div
                key={role.value}
                role="option"
                aria-selected={isSelected}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-gray-700 text-gray-100'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-gray-100'
                }`}
                onClick={() => handleSelect(role.value)}
              >
                <span className="text-base">{role.emoji}</span>
                <span className="text-sm">{role.label}</span>
                {isSelected && (
                  <svg
                    className="w-4 h-4 ml-auto text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
