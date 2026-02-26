import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from '@/components/chatbot/chat-interface';

// Mock the environment variables
vi.mock('@/components/providers/conditional-clerk-provider', () => ({
  ConditionalClerkProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('ChatInterface', () => {
  it('renders chat interface with initial message', () => {
    render(<ChatInterface />);
    
    expect(screen.getByText("Hi! I'm Travis, your personal assistant. Here to give you an early mark!")).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('displays user and assistant messages correctly', () => {
    render(<ChatInterface />);
    
    // Check for the initial assistant message
    const assistantMessage = screen.getByText("Hi! I'm Travis, your personal assistant. Here to give you an early mark!");
    expect(assistantMessage).toBeInTheDocument();
    
    // The message should be in a container with proper styling
    const messageContainer = assistantMessage.closest('div');
    expect(messageContainer).toHaveClass('bg-slate-100');
  });

  it('has a functional input field and send button', () => {
    render(<ChatInterface />);
    
    const input = screen.getByPlaceholderText('Type your message...') as HTMLInputElement;
    const sendButton = screen.getByRole('button');
    
    expect(input).toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();
    expect(input.type).toBe('text');
  });

  it('disables send button when input is empty', () => {
    render(<ChatInterface />);
    
    const sendButton = screen.getByRole('button');
    expect(sendButton).toBeDisabled();
  });

  it('enables send button when input has text', async () => {
    const user = userEvent.setup();
    render(<ChatInterface />);
    
    const input = screen.getByPlaceholderText('Type your message...') as HTMLInputElement;
    const sendButton = screen.getByRole('button');
    
    // Type a message
    await user.type(input, 'Test message');
    expect(sendButton).not.toBeDisabled();
  });

  it('submits form and shows user message', async () => {
    const user = userEvent.setup();
    render(<ChatInterface />);
    
    const input = screen.getByPlaceholderText('Type your message...') as HTMLInputElement;
    const sendButton = screen.getByRole('button');
    
    // Type a message
    await user.type(input, 'Test message');
    expect(sendButton).not.toBeDisabled();
    
    // Submit the form
    await user.click(sendButton);
    
    // Should show user message
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });
});
