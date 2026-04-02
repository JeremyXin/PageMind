import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SearchBar from './SearchBar';
import type { SearchResult, ChatSession } from '~/utils/types';

describe('SearchBar', () => {
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
  ];

  const mockResults: SearchResult[] = [
    {
      sessionId: 'session-1',
      sessionCreatedAt: Date.now(),
      matchIndex: 0,
      message: {
        id: 'm1',
        role: 'user',
        content: 'hello world',
        timestamp: Date.now(),
      },
    },
  ];

  const defaultProps = {
    onSearch: vi.fn(),
    onClose: vi.fn(),
    results: [],
    sessions: mockSessions,
    activeSessionId: '',
    onSelectSession: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders SessionList when search query is empty', () => {
    render(<SearchBar {...defaultProps} />);
    
    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('Second session')).toBeInTheDocument();
  });

  it('does not render SessionList when query has content', async () => {
    const user = userEvent.setup();
    render(<SearchBar {...defaultProps} results={mockResults} />);

    const input = screen.getByPlaceholderText('搜索历史消息...');
    await user.type(input, 'hello');

    await waitFor(() => {
      expect(defaultProps.onSearch).toHaveBeenCalled();
    }, { timeout: 500 });

    expect(screen.queryByText('First message')).not.toBeInTheDocument();
  });

  it('calls onSearch after 300ms debounce', async () => {
    const user = userEvent.setup();
    render(<SearchBar {...defaultProps} />);

    const input = screen.getByPlaceholderText('搜索历史消息...');
    await user.type(input, 'test');

    expect(defaultProps.onSearch).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(defaultProps.onSearch).toHaveBeenCalledWith('test');
    }, { timeout: 500 });
  });

  it('displays search results when query exists', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SearchBar {...defaultProps} />);

    const input = screen.getByPlaceholderText('搜索历史消息...');
    await user.type(input, 'hello');

    rerender(<SearchBar {...defaultProps} results={mockResults} />);

    await waitFor(() => {
      expect(screen.getByText('hello')).toBeInTheDocument();
      expect(screen.getByText('用户')).toBeInTheDocument();
    });
  });

  it('calls onSelectSession when session item is clicked', async () => {
    const user = userEvent.setup();
    render(<SearchBar {...defaultProps} />);

    const sessionButton = screen.getByText('First message').closest('button');
    expect(sessionButton).toBeInTheDocument();

    await user.click(sessionButton!);

    expect(defaultProps.onSelectSession).toHaveBeenCalledWith('session-1');
  });

  it('calls onSelectSession when search result is clicked', async () => {
    const user = userEvent.setup();
    render(<SearchBar {...defaultProps} results={mockResults} />);

    const input = screen.getByPlaceholderText('搜索历史消息...');
    await user.type(input, 'hello');

    await waitFor(() => {
      const resultItem = screen.getByText('hello').closest('div[class*="cursor-pointer"]');
      expect(resultItem).toBeInTheDocument();
    });

    const resultItem = screen.getByText('hello').closest('div[class*="cursor-pointer"]');
    await user.click(resultItem!);

    expect(defaultProps.onSelectSession).toHaveBeenCalledWith('session-1');
  });

  it('returns to SessionList when search query is cleared', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SearchBar {...defaultProps} />);

    const input = screen.getByPlaceholderText('搜索历史消息...');
    
    await user.type(input, 'hello');
    rerender(<SearchBar {...defaultProps} results={mockResults} />);

    await waitFor(() => {
      expect(screen.queryByText('First message')).not.toBeInTheDocument();
    });

    await user.clear(input);
    rerender(<SearchBar {...defaultProps} results={[]} />);

    await waitFor(() => {
      expect(screen.getByText('First message')).toBeInTheDocument();
    });
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<SearchBar {...defaultProps} />);

    const closeButton = screen.getByLabelText('关闭搜索');
    await user.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows "No results found" when search returns empty', async () => {
    const user = userEvent.setup();
    render(<SearchBar {...defaultProps} />);

    const input = screen.getByPlaceholderText('搜索历史消息...');
    await user.type(input, 'nonexistent');

    await waitFor(() => {
      expect(defaultProps.onSearch).toHaveBeenCalled();
    }, { timeout: 500 });

    expect(input).toHaveValue('nonexistent');
    
    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });
  });

  it('highlights active session in SessionList', () => {
    render(<SearchBar {...defaultProps} activeSessionId="session-1" />);

    const activeSession = screen.getByText('First message').closest('button');
    expect(activeSession).toHaveClass('bg-blue-50');
  });
});
