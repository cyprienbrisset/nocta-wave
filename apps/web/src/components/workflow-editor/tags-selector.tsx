'use client';

import { useState, useEffect } from 'react';
import { Tag, WorkflowTag, tagsApi, CreateTagRequest } from '@/lib/api/collaboration';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Tags, Plus, X, Check, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagsSelectorProps {
  teamId: string;
  workflowId: string;
  className?: string;
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
];

export function TagsSelector({ teamId, workflowId, className }: TagsSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [workflowTags, setWorkflowTags] = useState<WorkflowTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[4]);

  useEffect(() => {
    loadData();
  }, [teamId, workflowId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allTags, wfTags] = await Promise.all([
        tagsApi.getByTeam(teamId),
        tagsApi.getWorkflowTags(teamId, workflowId),
      ]);
      setTags(allTags);
      setWorkflowTags(wfTags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTag = async (tag: Tag) => {
    const isAssigned = workflowTags.some((wt) => wt.tagId === tag.id);

    try {
      if (isAssigned) {
        await tagsApi.removeFromWorkflow(teamId, workflowId, tag.id);
        setWorkflowTags((prev) => prev.filter((wt) => wt.tagId !== tag.id));
      } else {
        const newWorkflowTag = await tagsApi.assignToWorkflow(teamId, workflowId, tag.id);
        setWorkflowTags((prev) => [...prev, newWorkflowTag]);
      }
    } catch (error) {
      console.error('Failed to toggle tag:', error);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const created = await tagsApi.create(teamId, {
        name: newTagName.trim(),
        color: newTagColor,
      });
      setTags((prev) => [...prev, created]);

      // Auto-assign the new tag
      const newWorkflowTag = await tagsApi.assignToWorkflow(teamId, workflowId, created.id);
      setWorkflowTags((prev) => [...prev, newWorkflowTag]);

      setNewTagName('');
      setCreating(false);
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await tagsApi.removeFromWorkflow(teamId, workflowId, tagId);
      setWorkflowTags((prev) => prev.filter((wt) => wt.tagId !== tagId));
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
  };

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {/* Display assigned tags */}
      {workflowTags.map((wt) => (
        <Badge
          key={wt.tagId}
          variant="secondary"
          className="pl-2 pr-1 py-1 gap-1 group"
          style={{
            backgroundColor: `${wt.tag.color}20`,
            borderColor: wt.tag.color,
            color: wt.tag.color,
          }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: wt.tag.color }}
          />
          {wt.tag.name}
          <button
            className="ml-1 h-4 w-4 rounded-full hover:bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => handleRemoveTag(wt.tagId)}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* Add tag button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 border-dashed text-gray-400 hover:text-white"
          >
            <Tags className="h-3.5 w-3.5 mr-1" />
            Ajouter un tag
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-64 p-0 bg-gray-900 border-gray-700"
          align="start"
        >
          {creating ? (
            <div className="p-3 space-y-3">
              <Input
                placeholder="Nom du tag"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="bg-gray-800 border-gray-700"
                autoFocus
              />
              <div className="flex gap-1 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      'h-6 w-6 rounded-full transition-transform',
                      newTagColor === color && 'ring-2 ring-white ring-offset-2 ring-offset-gray-900'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewTagColor(color)}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                >
                  Créer
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setCreating(false);
                    setNewTagName('');
                  }}
                >
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <Command className="bg-transparent">
              <CommandInput
                placeholder="Rechercher un tag..."
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty className="py-6 text-center text-sm text-gray-500">
                  Aucun tag trouvé
                </CommandEmpty>
                <CommandGroup>
                  {filteredTags.map((tag) => {
                    const isAssigned = workflowTags.some((wt) => wt.tagId === tag.id);
                    return (
                      <CommandItem
                        key={tag.id}
                        onSelect={() => handleToggleTag(tag)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="flex-1">{tag.name}</span>
                        {isAssigned && (
                          <Check className="h-4 w-4 text-green-400" />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => setCreating(true)}
                    className="flex items-center gap-2 cursor-pointer text-indigo-400"
                  >
                    <Plus className="h-4 w-4" />
                    Créer un nouveau tag
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
