import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import SessionList from './SessionList';
import type { ChatSession } from '~/utils/types';

describe('SessionList', () => {
  const mockSessions: ChatSession[] = [
    {
      id: 'session-1',
      createdAt: new Date('2024-01-15T10:30:00').getTime(),
      messages: [
        { id: 'm1', role: 'user', content: 'First message', timestamp: Date.now() },
        { id: 'm2', role: 'assistant', content: 'Response', timestamp: Date.now() },
      ],
    },
    {
      id: 'session-2',
      createdAt: new Date('2024-01-14T14:20:00').getTime(),
      messages: [
        { id: 'm3', role: 'user', content: 'Second session', timestamp: Date.now() },
      ],
    },
    {
      id: 'session-3',
      createdAt: new Date('2024-01-16T08:45:00').getTime(),
      messages: [
        { id: 'm4', role: 'user', content: 'Third message here', timestamp: Date.now() },
        { id: 'm5', role: 'assistant', content: 'AI response', timestamp: Date.now() },
        { id: 'm6', role: 'user', content: 'Follow up', timestamp: Date.now() },
      ],
    },
  ];

  it('renders 3 sessions with title, date, and message count', () => {
    const onSelect = vi.fn();
    render(<SessionList sessions={mockSessions} activeSessionId="" onSelect={onSelect} />);

    // Check all sessions are rendered (sorted newest first)
    const sessionItems = screen.getAllByRole('button');
    expect(sessionItems).toHaveLength(3);

    // Session 3 (newest - 2024-01-16)
    expect(screen.getByText('Third message here')).toBeInTheDocument();
    expect(screen.getByText('01/16 08:45')).toBeInTheDocument();
    expect(screen.getByText('3 条消息')).toBeInTheDocument();

    // Session 1 (2024-01-15)
    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('01/15 10:30')).toBeInTheDocument();
    expect(screen.getByText('2 条消息')).toBeInTheDocument();

    // Session 2 (oldest - 2024-01-14)
    expect(screen.getByText('Second session')).toBeInTheDocument();
    expect(screen.getByText('01/14 14:20')).toBeInTheDocument();
    expect(screen.getByText('1 条消息')).toBeInTheDocument();
  });

  it('shows empty state when no sessions', () => {
    const onSelect = vi.fn();
    render(<SessionList sessions={[]} activeSessionId="" onSelect={onSelect} />);

    expect(screen.getByText('暂无历史会话')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onSelect with sessionId when session is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SessionList sessions={mockSessions} activeSessionId="" onSelect={onSelect} />);

    const firstSession = screen.getByText('Third message here').closest('button');
    expect(firstSession).toBeInTheDocument();

    await user.click(firstSession!);

    expect(onSelect).toHaveBeenCalledWith('session-3');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('highlights active session with blue background and left border', () => {
    const onSelect = vi.fn();
    render(<SessionList sessions={mockSessions} activeSessionId="session-1" onSelect={onSelect} />);

    const activeSession = screen.getByText('First message').closest('button');
    const inactiveSession = screen.getByText('Third message here').closest('button');

    // Active session has blue background and blue left border
    expect(activeSession).toHaveClass('bg-blue-50');
    expect(activeSession).toHaveClass('border-l-4');
    expect(activeSession).toHaveClass('border-blue-500');

    // Inactive session does not have blue background
    expect(inactiveSession).not.toHaveClass('bg-blue-50');
    expect(inactiveSession).not.toHaveClass('border-l-4');
  });

  it('uses deriveSessionTitle fallback when no user messages', () => {
    const onSelect = vi.fn();
    const emptySession: ChatSession = {
      id: 'empty',
      createdAt: Date.now(),
      messages: [{ id: 'm7', role: 'assistant', content: 'Only AI message', timestamp: Date.now() }],
    };

    render(<SessionList sessions={[emptySession]} activeSessionId="" onSelect={onSelect} />);

    expect(screen.getByText('新对话')).toBeInTheDocument();
  });

  it('truncates long titles to 30 characters with ellipsis', () => {
    const onSelect = vi.fn();
    const longTitleSession: ChatSession = {
      id: 'long',
      createdAt: Date.now(),
      messages: [
        {
          id: 'm8',
          role: 'user',
          content: 'This is a very long message that exceeds thirty characters and should be truncated',
          timestamp: Date.now(),
        },
      ],
    };

    render(<SessionList sessions={[longTitleSession]} activeSessionId="" onSelect={onSelect} />);

    expect(screen.getByText('This is a very long message th…')).toBeInTheDocument();
  });
});
