'use client';

import { useState, useEffect, useRef } from 'react';
import { Comment, commentsApi, CreateCommentRequest } from '@/lib/api/collaboration';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Send,
  Check,
  MoreVertical,
  Reply,
  Trash2,
  Edit2,
  X,
  CheckCircle,
  Circle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CommentsPanelProps {
  workflowId: string;
  selectedNodeId?: string | null;
  currentUserId: string;
  className?: string;
  onCommentClick?: (comment: Comment) => void;
}

export function CommentsPanel({
  workflowId,
  selectedNodeId,
  currentUserId,
  className,
  onCommentClick,
}: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadComments();
  }, [workflowId, selectedNodeId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await commentsApi.getByWorkflow(workflowId, {
        nodeId: selectedNodeId || undefined,
        resolved: filter === 'resolved' ? true : filter === 'open' ? false : undefined,
      });
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    try {
      const data: CreateCommentRequest = {
        workflowId,
        content: newComment.trim(),
        nodeId: selectedNodeId || undefined,
        parentId: replyingTo || undefined,
      };

      const created = await commentsApi.create(data);

      if (replyingTo) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyingTo
              ? { ...c, replies: [...(c.replies || []), created] }
              : c
          )
        );
      } else {
        setComments((prev) => [created, ...prev]);
      }

      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to create comment:', error);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editContent.trim()) return;

    try {
      const updated = await commentsApi.update(id, { content: editContent.trim() });
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, content: updated.content } : c))
      );
      setEditingId(null);
      setEditContent('');
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await commentsApi.delete(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleResolve = async (id: string, resolved: boolean) => {
    try {
      const updated = resolved
        ? await commentsApi.unresolve(id)
        : await commentsApi.resolve(id);
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, resolved: updated.resolved } : c))
      );
    } catch (error) {
      console.error('Failed to toggle resolve:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div
      key={comment.id}
      className={cn(
        'group rounded-lg p-3 transition-colors',
        isReply ? 'ml-8 bg-gray-800/30' : 'bg-gray-800/50',
        comment.resolved && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.author.avatar || undefined} />
          <AvatarFallback className="bg-indigo-600 text-xs">
            {getInitials(comment.author.name || comment.author.email)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-white">
              {comment.author.name || comment.author.email}
            </span>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
                locale: fr,
              })}
            </span>
            {comment.nodeId && !isReply && (
              <Badge variant="outline" className="text-xs">
                Node
              </Badge>
            )}
            {comment.resolved && (
              <Badge variant="secondary" className="text-xs bg-green-900/50 text-green-400">
                <CheckCircle className="h-3 w-3 mr-1" />
                Résolu
              </Badge>
            )}
          </div>

          {editingId === comment.id ? (
            <div className="mt-2">
              <Textarea
                value={editContent}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditContent(e.target.value)}
                className="min-h-[60px] bg-gray-900 border-gray-700"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={() => handleEdit(comment.id)}>
                  Sauvegarder
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(null);
                    setEditContent('');
                  }}
                >
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <p
              className="mt-1 text-sm text-gray-300 cursor-pointer"
              onClick={() => onCommentClick?.(comment)}
            >
              {comment.content}
            </p>
          )}

          {!isReply && !editingId && (
            <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-gray-400 hover:text-white"
                onClick={() => {
                  setReplyingTo(comment.id);
                  textareaRef.current?.focus();
                }}
              >
                <Reply className="h-3 w-3 mr-1" />
                Répondre
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-7 text-xs',
                  comment.resolved
                    ? 'text-green-400 hover:text-green-300'
                    : 'text-gray-400 hover:text-white'
                )}
                onClick={() => handleResolve(comment.id, comment.resolved)}
              >
                {comment.resolved ? (
                  <>
                    <Circle className="h-3 w-3 mr-1" />
                    Rouvrir
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Résoudre
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {(comment.authorId === currentUserId || !isReply) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
              {comment.authorId === currentUserId && (
                <DropdownMenuItem
                  onClick={() => {
                    setEditingId(comment.id);
                    setEditContent(comment.content);
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-red-400"
                onClick={() => handleDelete(comment.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-2">
          {comment.replies.map((reply) => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-indigo-400" />
          <h3 className="font-medium">Commentaires</h3>
          {comments.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {comments.length}
            </Badge>
          )}
        </div>

        <div className="flex gap-1">
          {(['all', 'open', 'resolved'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs"
              onClick={() => {
                setFilter(f);
                loadComments();
              }}
            >
              {f === 'all' ? 'Tous' : f === 'open' ? 'Ouverts' : 'Résolus'}
            </Button>
          ))}
        </div>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            Chargement...
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Aucun commentaire</p>
          </div>
        ) : (
          comments.map((comment) => renderComment(comment))
        )}
      </div>

      {/* New comment input */}
      <div className="p-4 border-t border-gray-700">
        {replyingTo && (
          <div className="flex items-center justify-between mb-2 p-2 bg-gray-800 rounded-lg text-sm">
            <span className="text-gray-400">
              Réponse à{' '}
              {comments.find((c) => c.id === replyingTo)?.author.name || 'un commentaire'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setReplyingTo(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewComment(e.target.value)}
            placeholder={
              selectedNodeId
                ? 'Commenter ce node...'
                : 'Ajouter un commentaire...'
            }
            className="min-h-[60px] bg-gray-800 border-gray-700 resize-none"
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit();
              }
            }}
          />
          <Button
            size="icon"
            className="shrink-0"
            onClick={handleSubmit}
            disabled={!newComment.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Ctrl+Enter pour envoyer
        </p>
      </div>
    </div>
  );
}
