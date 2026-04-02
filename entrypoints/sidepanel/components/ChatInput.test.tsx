import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInput from './ChatInput';

describe('ChatInput', () => {
  it('should not call onSend when message is empty and Enter is pressed', async () => {
    const mockOnSend = vi.fn();
    const user = userEvent.setup();

    render(<ChatInput onSend={mockOnSend} disabled={false} />);
    
    const textarea = screen.getByPlaceholderText('输入消息...');
    await user.click(textarea);
    await user.keyboard('{Enter}');

    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it('should call onSend when Enter is pressed with non-empty message', async () => {
    const mockOnSend = vi.fn();
    const user = userEvent.setup();

    render(<ChatInput onSend={mockOnSend} disabled={false} />);
    
    const textarea = screen.getByPlaceholderText('输入消息...');
    await user.type(textarea, 'Hello world{Enter}');

    expect(mockOnSend).toHaveBeenCalledWith('Hello world');
    expect(mockOnSend).toHaveBeenCalledTimes(1);
  });

  it('should not call onSend when Shift+Enter is pressed', async () => {
    const mockOnSend = vi.fn();
    const user = userEvent.setup();

    render(<ChatInput onSend={mockOnSend} disabled={false} />);
    
    const textarea = screen.getByPlaceholderText('输入消息...');
    await user.type(textarea, 'Hello world{Shift>}{Enter}{/Shift}');

    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it('should disable send button when disabled prop is true', async () => {
    const mockOnSend = vi.fn();

    render(<ChatInput onSend={mockOnSend} disabled={true} />);
    
    const sendButton = screen.getByLabelText('发送消息');
    expect(sendButton).toBeDisabled();
  });
});

describe('ChatInput slash command feature (RED phase)', () => {
  it('should show command listbox when typing / as first character', async () => {
    const mockOnSend = vi.fn();
    const mockOnCommand = vi.fn();
    const user = userEvent.setup();

    render(<ChatInput onSend={mockOnSend} disabled={false} onCommand={mockOnCommand} />);

    const textarea = screen.getByPlaceholderText('输入消息...');
    await user.type(textarea, '/');

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();

    const option = screen.getByRole('option', { name: /summarize/ });
    expect(option).toBeInTheDocument();
  });

  it('should filter commands when typing /sum', async () => {
    const mockOnSend = vi.fn();
    const mockOnCommand = vi.fn();
    const user = userEvent.setup();

    render(<ChatInput onSend={mockOnSend} disabled={false} onCommand={mockOnCommand} />);

    const textarea = screen.getByPlaceholderText('输入消息...');
    await user.type(textarea, '/sum');

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();

    const option = screen.getByRole('option', { name: /summarize/ });
    expect(option).toBeInTheDocument();
  });

  it('should hide listbox and keep / when pressing Escape', async () => {
    const mockOnSend = vi.fn();
    const mockOnCommand = vi.fn();
    const user = userEvent.setup();

    render(<ChatInput onSend={mockOnSend} disabled={false} onCommand={mockOnCommand} />);

    const textarea = screen.getByPlaceholderText('输入消息...');
    await user.type(textarea, '/');

    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(textarea).toHaveValue('/');
  });

  it('should NOT show command popup when / is in middle of text', async () => {
    const mockOnSend = vi.fn();
    const mockOnCommand = vi.fn();
    const user = userEvent.setup();

    render(<ChatInput onSend={mockOnSend} disabled={false} onCommand={mockOnCommand} />);

    const textarea = screen.getByPlaceholderText('输入消息...');
    await user.type(textarea, 'http://example.com');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should call onCommand with first command (summarize) when pressing Enter without ArrowDown', async () => {
    const mockOnSend = vi.fn();
    const mockOnCommand = vi.fn();
    const user = userEvent.setup();

    render(<ChatInput onSend={mockOnSend} disabled={false} onCommand={mockOnCommand} />);

    const textarea = screen.getByPlaceholderText('输入消息...');
    await user.type(textarea, '/');

    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // First command is selected by default (index 0), press Enter directly
    await user.keyboard('{Enter}');

    expect(mockOnCommand).toHaveBeenCalledWith('summarize');
    expect(mockOnCommand).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(textarea).toHaveValue('');
  });

  it('should show summarize command as disabled when isSummarizing is true', async () => {
    const mockOnSend = vi.fn();
    const mockOnCommand = vi.fn();
    const user = userEvent.setup();

    render(<ChatInput onSend={mockOnSend} disabled={false} onCommand={mockOnCommand} isSummarizing={true} />);

    const textarea = screen.getByPlaceholderText('输入消息...');
    await user.type(textarea, '/');

    const option = screen.getByRole('option', { name: /summarize/ });
    expect(option).toHaveAttribute('aria-disabled', 'true');
  });
});

describe('ChatInput slash command feature (GREEN phase - 11 commands)', () => {
  it('should show all 11 commands when typing /', async () => {
    const mockOnSend = vi.fn();
    const mockOnCommand = vi.fn();
    const user = userEvent.setup();

    render(<ChatInput onSend={mockOnSend} disabled={false} onCommand={mockOnCommand} />);

    const textarea = screen.getByPlaceholderText('输入消息...');
    await user.type(textarea, '/');

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();

    // Verify all 11 commands are shown
    expect(screen.getByRole('option', { name: /summarize/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /translate/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /rewrite/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /shorter/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /longer/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /eli5/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /pros-cons/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /actions/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /clear/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /new/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /help/ })).toBeInTheDocument();

    // Verify 11 options total
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(11);
  });

  it('should filter to only eli5 command when typing /eli', async () => {
    const mockOnSend = vi.fn();
    const mockOnCommand = vi.fn();
    const user = userEvent.setup();

    render(<ChatInput onSend={mockOnSend} disabled={false} onCommand={mockOnCommand} />);

    const textarea = screen.getByPlaceholderText('输入消息...');
    await user.type(textarea, '/eli');

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();

    // Should only show eli5
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(screen.getByRole('option', { name: /eli5/ })).toBeInTheDocument();
  });

  it('should filter to help command when typing /hel', async () => {
    const mockOnSend = vi.fn();
    const mockOnCommand = vi.fn();
    const user = userEvent.setup();

    render(<ChatInput onSend={mockOnSend} disabled={false} onCommand={mockOnCommand} />);

    const textarea = screen.getByPlaceholderText('输入消息...');
    await user.type(textarea, '/hel');

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();

    // Should show only help (unique match)
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(screen.getByRole('option', { name: /help/ })).toBeInTheDocument();
  });

  it('should show clear and new commands as NOT disabled when isSummarizing is true', async () => {
    const mockOnSend = vi.fn();
    const mockOnCommand = vi.fn();
    const user = userEvent.setup();

    render(<ChatInput onSend={mockOnSend} disabled={false} onCommand={mockOnCommand} isSummarizing={true} />);

    const textarea = screen.getByPlaceholderText('输入消息...');
    await user.type(textarea, '/');

    // clear and new should NOT be disabled during summarizing
    const clearOption = screen.getByRole('option', { name: /clear/ });
    const newOption = screen.getByRole('option', { name: /new/ });

    expect(clearOption).toHaveAttribute('aria-disabled', 'false');
    expect(newOption).toHaveAttribute('aria-disabled', 'false');

    // summarize should still be disabled
    const summarizeOption = screen.getByRole('option', { name: /summarize/ });
    expect(summarizeOption).toHaveAttribute('aria-disabled', 'true');
  });
});
