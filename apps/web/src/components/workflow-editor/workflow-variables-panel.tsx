'use client';

import { useState } from 'react';
import { Plus, Trash2, Variable, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface WorkflowVariable {
  name: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
}

interface WorkflowVariablesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  variables: WorkflowVariable[];
  onChange: (variables: WorkflowVariable[]) => void;
}

export function WorkflowVariablesPanel({
  isOpen,
  onClose,
  variables,
  onChange,
}: WorkflowVariablesPanelProps) {
  const [newVarName, setNewVarName] = useState('');
  const [newVarType, setNewVarType] = useState<WorkflowVariable['type']>('string');
  const [newVarValue, setNewVarValue] = useState('');

  if (!isOpen) return null;

  const handleAddVariable = () => {
    if (!newVarName.trim()) return;

    // Vérifier les doublons
    if (variables.some((v) => v.name === newVarName)) {
      return;
    }

    onChange([
      ...variables,
      { name: newVarName.trim(), value: newVarValue, type: newVarType },
    ]);
    setNewVarName('');
    setNewVarValue('');
    setNewVarType('string');
  };

  const handleUpdateVariable = (index: number, field: keyof WorkflowVariable, value: string) => {
    const updated = [...variables];
    const current = updated[index];
    if (current) {
      updated[index] = { ...current, [field]: value } as WorkflowVariable;
      onChange(updated);
    }
  };

  const handleDeleteVariable = (index: number) => {
    onChange(variables.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <Variable className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Variables du workflow</h2>
              <p className="text-xs text-muted-foreground">Gérez vos variables globales</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="max-h-[400px]">
          <div className="p-5">
            <div className="mb-5 rounded-xl bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                Définissez des variables utilisables dans tout votre workflow avec la syntaxe{' '}
                <code className="rounded-lg bg-primary/10 px-2 py-0.5 text-primary font-mono text-xs">
                  {'{{variables.nom}}'}
                </code>
              </p>
            </div>

            {/* Variables existantes */}
            <div className="mb-6 space-y-3">
              {variables.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed py-8 text-center">
                  <Variable className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Aucune variable définie
                  </p>
                </div>
              ) : (
                variables.map((variable, index) => (
                  <div key={index} className="flex items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex-1">
                      <Label className="text-xs font-medium text-muted-foreground">Nom</Label>
                      <Input
                        value={variable.name}
                        onChange={(e) => handleUpdateVariable(index, 'name', e.target.value)}
                        className="mt-1.5 h-9 bg-muted/50"
                      />
                    </div>
                    <div className="w-28">
                      <Label className="text-xs font-medium text-muted-foreground">Type</Label>
                      <select
                        value={variable.type}
                        onChange={(e) =>
                          handleUpdateVariable(index, 'type', e.target.value as WorkflowVariable['type'])
                        }
                        className="mt-1.5 flex h-9 w-full rounded-lg border border-input bg-muted/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="string">Texte</option>
                        <option value="number">Nombre</option>
                        <option value="boolean">Booléen</option>
                        <option value="json">JSON</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs font-medium text-muted-foreground">Valeur par défaut</Label>
                      <Input
                        value={variable.value}
                        onChange={(e) => handleUpdateVariable(index, 'value', e.target.value)}
                        className="mt-1.5 h-9 bg-muted/50"
                        placeholder={variable.type === 'json' ? '{}' : ''}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                      onClick={() => handleDeleteVariable(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Ajouter une nouvelle variable */}
            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4">
              <h4 className="mb-3 text-sm font-semibold text-primary">Nouvelle variable</h4>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Label className="text-xs font-medium text-muted-foreground">Nom</Label>
                  <Input
                    value={newVarName}
                    onChange={(e) => setNewVarName(e.target.value)}
                    placeholder="maVariable"
                    className="mt-1.5 h-9"
                  />
                </div>
                <div className="w-28">
                  <Label className="text-xs font-medium text-muted-foreground">Type</Label>
                  <select
                    value={newVarType}
                    onChange={(e) => setNewVarType(e.target.value as WorkflowVariable['type'])}
                    className="mt-1.5 flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="string">Texte</option>
                    <option value="number">Nombre</option>
                    <option value="boolean">Booléen</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs font-medium text-muted-foreground">Valeur par défaut</Label>
                  <Input
                    value={newVarValue}
                    onChange={(e) => setNewVarValue(e.target.value)}
                    placeholder="valeur"
                    className="mt-1.5 h-9"
                  />
                </div>
                <Button
                  onClick={handleAddVariable}
                  disabled={!newVarName.trim()}
                  className="h-9 rounded-lg"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Ajouter
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end border-t p-4">
          <Button onClick={onClose} className="rounded-xl px-6">
            Terminé
          </Button>
        </div>
      </div>
    </div>
  );
}
