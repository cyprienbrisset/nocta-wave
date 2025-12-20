'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useCollaborationStore, useTypingUsers } from '@/stores/collaboration.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { MessageSquare, Send, X, Reply, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ChatMessageData } from '@ws-flows/shared';

interface ChatMessageProps {
  message: ChatMessageData;
  onReply?: (messageId: string) => void;
}

function ChatMessage({ message, onReply }: ChatMessageProps) {
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: fr,
    });
  };

  // Highlight mentions in content
  const renderContent = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="text-primary font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="group flex gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors">
      <Avatar className="w-8 h-8 flex-shrink-0">
        {message.author.avatar && (
          <AvatarImage src={message.author.avatar} alt={message.author.name || ''} />
        )}
        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
          {getInitials(message.author.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-sm">
            {message.author.name || message.author.email.split('@')[0]}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(message.createdAt)}
          </span>
          {message.editedAt && (
            <span className="text-xs text-muted-foreground">(modifié)</span>
          )}
        </div>

        <p className="text-sm mt-0.5 break-words">{renderContent(message.content)}</p>

        {message.replyCount && message.replyCount > 0 && (
          <button className="flex items-center gap-1 mt-1 text-xs text-primary hover:underline">
            <Reply className="w-3 h-3" />
            {message.replyCount} réponse{message.replyCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onReply?.(message.id)}
        >
          <Reply className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function TypingIndicator() {
  const typingUsers = useTypingUsers();

  if (typingUsers.length === 0) return null;

  const names = typingUsers.map((u) => u.userName);
  let text = '';

  if (names.length === 1) {
    text = `${names[0]} est en train d'écrire...`;
  } else if (names.length === 2) {
    text = `${names[0]} et ${names[1]} sont en train d'écrire...`;
  } else {
    text = `${names.length} personnes sont en train d'écrire...`;
  }

  return (
    <div className="px-4 py-2 text-xs text-muted-foreground flex items-center gap-2">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
        <span
          className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
          style={{ animationDelay: '0.1s' }}
        />
        <span
          className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
          style={{ animationDelay: '0.2s' }}
        />
      </div>
      {text}
    </div>
  );
}

interface WorkflowChatProps {
  className?: string;
}

export function WorkflowChat({ className }: WorkflowChatProps) {
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const messages = useCollaborationStore((s) => s.messages);
  const unreadCount = useCollaborationStore((s) => s.unreadCount);
  const isChatOpen = useCollaborationStore((s) => s.isChatOpen);
  const setChatOpen = useCollaborationStore((s) => s.setChatOpen);
  const sendMessage = useCollaborationStore((s) => s.sendMessage);
  const setTyping = useCollaborationStore((s) => s.setTyping);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current && isChatOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isChatOpen]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    setTyping(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 2000);
  }, [setTyping]);

  const handleSend = async () => {
    if (!message.trim()) return;

    try {
      await sendMessage(message.trim(), replyTo || undefined);
      setMessage('');
      setReplyTo(null);
      setTyping(false);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sheet open={isChatOpen} onOpenChange={setChatOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className={cn('relative', className)}>
          <MessageSquare className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-96 p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Chat du workflow
          </SheetTitle>
        </SheetHeader>

        {/* Messages area */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="py-2">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Aucun message</p>
                <p className="text-xs">Commencez la conversation !</p>
              </div>
            ) : (
              messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onReply={(id) => {
                    setReplyTo(id);
                    inputRef.current?.focus();
                  }}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Typing indicator */}
        <TypingIndicator />

        {/* Reply indicator */}
        {replyTo && (
          <div className="px-4 py-2 bg-muted/50 border-t flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Reply className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Réponse à un message</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyTo(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Input area */}
        <div className="p-4 border-t">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleTyping();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Écrivez un message..."
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!message.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
