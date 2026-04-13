import { useState, useRef, useEffect } from 'react';
import type { AgentRole } from '~/utils/types';

interface AgentRoleSelectorProps {
  value: AgentRole;
  onChange: (role: AgentRole) => void;
}

interface RoleOption {
  value: AgentRole;
  label: string;
  emoji: string;
  desc: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  { value: 'smart-reader', label: '阅读助手', emoji: '📖', desc: '分析文章，提供见解' },
  { value: 'general',      label: '通用助手', emoji: '🤖', desc: '通用问题解答' },
  { value: 'analyst',      label: '分析师',   emoji: '🔍', desc: '深度数据分析' },
  { value: 'creative',     label: '创意助手', emoji: '✨', desc: '灵感与创作' },
  { value: 'coder',        label: '代码助手', emoji: '💻', desc: '编程与开发' },
];

export default function AgentRoleSelector({ value, onChange }: AgentRoleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
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
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
        aria-label="切换角色"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title="切换助手角色"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-4 h-4"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="选择助手角色"
          className="absolute z-50 overflow-hidden"
          style={{
            top: 'calc(100% + 6px)',
            right: 0,
            width: 220,
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(229,231,235,0.8)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            animation: 'roleDropdownIn 0.2s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          <style>{`
            @keyframes roleDropdownIn {
              from { opacity: 0; transform: translateY(-8px) scale(0.96); }
              to   { opacity: 1; transform: translateY(0)   scale(1);    }
            }
          `}</style>

          <div
            className="px-3.5 py-2.5 border-b border-gray-100"
            style={{
              background: 'linear-gradient(to bottom, #f9fafb, #ffffff)',
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#6b7280',
            }}
          >
            当前模式
          </div>

          <div className="p-1.5">
            {ROLE_OPTIONS.map((role) => {
              const isSelected = role.value === value;
              return (
                <div
                  key={role.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(role.value)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer mb-1 last:mb-0 transition-all duration-150"
                  style={
                    isSelected
                      ? {
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: 'white',
                          transform: 'scale(1)',
                        }
                      : {
                          color: '#111827',
                        }
                  }
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLDivElement).style.background = '#f3f4f6';
                      (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.01)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLDivElement).style.background = '';
                      (e.currentTarget as HTMLDivElement).style.transform = '';
                    }
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-md flex-shrink-0"
                    style={{
                      width: 32,
                      height: 32,
                      fontSize: 16,
                      background: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
                    }}
                  >
                    {role.emoji}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: isSelected ? 'white' : '#111827',
                        marginBottom: 2,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {role.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: isSelected ? 'rgba(255,255,255,0.8)' : '#6b7280',
                        lineHeight: 1.3,
                      }}
                    >
                      {role.desc}
                    </div>
                  </div>

                  {isSelected && (
                    <div
                      className="flex items-center justify-center flex-shrink-0 rounded-full"
                      style={{
                        width: 16,
                        height: 16,
                        background: 'rgba(255,255,255,0.3)',
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path
                          d="M8.5 2.5L3.5 7.5L1.5 5.5"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
