'use client';

import type { ReactNode } from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trash2, Zap, Globe, Code, GitBranch, Database, MessageSquare, Wrench, Variable, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { nodesApi, type InputDefinition } from '@/lib/api/nodes';
import { useWorkflowStore } from '@/stores/workflow.store';
import { cn } from '@/lib/utils';
import { CredentialSelector } from './credential-selector';
import { VariablePicker, type VariableOption } from './variable-picker';
import type { CredentialType } from '@/lib/api/credentials';
import type { WorkflowVariable } from './workflow-variables-panel';

interface NodeEditModalProps {
  nodeId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  workflowVariables?: WorkflowVariable[];
}

const categoryConfig: Record<string, { icon: ReactNode; color: string; borderColor: string }> = {
  trigger: { icon: <Zap className="h-5 w-5" />, color: 'text-green-500', borderColor: 'border-green-500' },
  http: { icon: <Globe className="h-5 w-5" />, color: 'text-blue-500', borderColor: 'border-blue-500' },
  transform: { icon: <Code className="h-5 w-5" />, color: 'text-purple-500', borderColor: 'border-purple-500' },
  logic: { icon: <GitBranch className="h-5 w-5" />, color: 'text-orange-500', borderColor: 'border-orange-500' },
  database: { icon: <Database className="h-5 w-5" />, color: 'text-cyan-500', borderColor: 'border-cyan-500' },
  integration: { icon: <MessageSquare className="h-5 w-5" />, color: 'text-pink-500', borderColor: 'border-pink-500' },
  utility: { icon: <Wrench className="h-5 w-5" />, color: 'text-gray-500', borderColor: 'border-gray-600' },
};

// Map node types to credential types
const nodeCredentialTypes: Record<string, CredentialType[]> = {
  'integration.slack': ['OAUTH2', 'API_KEY'],
  'integration.discord': ['API_KEY'],
  'integration.github': ['OAUTH2', 'API_KEY'],
  'integration.gmail': ['OAUTH2'],
  'integration.google-sheets': ['OAUTH2'],
  'integration.notion': ['API_KEY'],
  'integration.airtable': ['API_KEY'],
  'integration.stripe': ['API_KEY'],
  'integration.twilio': ['API_KEY', 'BASIC_AUTH'],
  'integration.sendgrid': ['API_KEY'],
  'integration.openai': ['API_KEY'],
  'integration.webflow': ['API_KEY'],
  'integration.rss': ['API_KEY'],
  'database.postgres': ['DATABASE'],
  'database.mysql': ['DATABASE'],
  'database.mongodb': ['DATABASE'],
  'database.redis': ['DATABASE'],
  'integration.aws-s3': ['AWS'],
  'http.request': ['API_KEY', 'BASIC_AUTH', 'OAUTH2'],
  'trigger.webhook': ['API_KEY'],
};

export function NodeEditModal({ nodeId, isOpen, onClose, onDelete, workflowVariables = [] }: NodeEditModalProps) {
  const { nodes, edges, updateNode } = useWorkflowStore();
  const selectedNode = nodes.find((n) => n.id === nodeId);

  const { data: nodeDefinition } = useQuery({
    queryKey: ['node-definition', selectedNode?.data?.nodeType],
    queryFn: () => nodesApi.getByType(selectedNode!.data.nodeType),
    enabled: !!selectedNode?.data?.nodeType,
  });

  // Build available variables from previous nodes
  const availableVariables = useMemo((): VariableOption[] => {
    if (!nodeId) return [];

    const variables: VariableOption[] = [];

    // Find all nodes that come before this node in the flow
    const getPreviousNodes = (currentNodeId: string, visited = new Set<string>()): string[] => {
      if (visited.has(currentNodeId)) return [];
      visited.add(currentNodeId);

      const incomingEdges = edges.filter(e => e.target === currentNodeId);
      const previousNodeIds: string[] = [];

      for (const edge of incomingEdges) {
        previousNodeIds.push(edge.source);
        previousNodeIds.push(...getPreviousNodes(edge.source, visited));
      }

      return previousNodeIds;
    };

    const previousNodeIds = getPreviousNodes(nodeId);

    // Add variables from previous nodes
    for (const prevNodeId of previousNodeIds) {
      const prevNode = nodes.find(n => n.id === prevNodeId);
      if (prevNode) {
        variables.push({
          id: `${prevNodeId}-output`,
          label: `${prevNode.data.label} - Output`,
          path: `${prevNodeId}.output`,
          type: 'node',
          nodeId: prevNodeId,
          nodeName: prevNode.data.label,
          dataType: 'object',
        });

        variables.push({
          id: `${prevNodeId}-output-data`,
          label: `${prevNode.data.label} - data`,
          path: `${prevNodeId}.output.data`,
          type: 'node',
          nodeId: prevNodeId,
          nodeName: prevNode.data.label,
        });

        if (prevNode.data.nodeType?.startsWith('http.')) {
          variables.push(
            {
              id: `${prevNodeId}-output-body`,
              label: `${prevNode.data.label} - body`,
              path: `${prevNodeId}.output.body`,
              type: 'node',
              nodeId: prevNodeId,
              nodeName: prevNode.data.label,
              dataType: 'object',
            },
            {
              id: `${prevNodeId}-output-status`,
              label: `${prevNode.data.label} - status`,
              path: `${prevNodeId}.output.status`,
              type: 'node',
              nodeId: prevNodeId,
              nodeName: prevNode.data.label,
              dataType: 'number',
            }
          );
        }
      }
    }

    // Add user-defined workflow variables
    for (const wfVar of workflowVariables) {
      variables.push({
        id: `var-${wfVar.name}`,
        label: wfVar.name,
        path: `variables.${wfVar.name}`,
        type: 'workflow',
        description: `Valeur par défaut: ${wfVar.value || '(vide)'}`,
        dataType: wfVar.type === 'json' ? 'object' : wfVar.type,
      });
    }

    // Add system workflow variables
    variables.push(
      {
        id: 'workflow-id',
        label: 'Workflow ID',
        path: 'workflow.id',
        type: 'system',
        dataType: 'string',
      },
      {
        id: 'execution-id',
        label: 'Execution ID',
        path: 'execution.id',
        type: 'system',
        dataType: 'string',
      }
    );

    return variables;
  }, [nodeId, nodes, edges, workflowVariables]);

  if (!nodeId || !selectedNode) {
    return null;
  }

  const handleConfigChange = (name: string, value: unknown) => {
    updateNode(nodeId, {
      config: {
        ...selectedNode.data.config,
        [name]: value,
      },
    });
  };

  const handleCredentialChange = (credentialId: string | null) => {
    updateNode(nodeId, {
      credentialId: credentialId || undefined,
    });
  };

  const handleLabelChange = (label: string) => {
    updateNode(nodeId, { label });
  };

  const category = selectedNode.data.nodeType?.split('.')[0] || 'utility';
  const defaultConfig = { icon: <Wrench className="h-5 w-5" />, color: 'text-gray-500', borderColor: 'border-gray-600' };
  const config = categoryConfig[category] ?? defaultConfig;

  // Check if this node type requires credentials
  const requiredCredentialTypes = nodeCredentialTypes[selectedNode.data.nodeType] || null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-[#1a1a2e] border-gray-700 text-white p-0 gap-0">
        {/* Hidden title for accessibility */}
        <DialogTitle className="sr-only">
          Modifier le node {selectedNode.data.label}
        </DialogTitle>

        {/* Header */}
        <div className={cn('flex items-center gap-4 p-4 border-b border-gray-700')}>
          <div className={cn('rounded-lg p-2.5 bg-gray-900/50 border', config.color, config.borderColor)}>
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <Input
              value={selectedNode.data.label}
              onChange={(e) => handleLabelChange(e.target.value)}
              className="h-8 text-lg font-semibold bg-transparent border-none p-0 text-white focus-visible:ring-0"
            />
            <p className="text-xs text-gray-500">{selectedNode.data.nodeType}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (window.confirm('Supprimer ce node ?')) {
                onDelete(nodeId);
                onClose();
              }
            }}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="max-h-[60vh]">
          <div className="p-4 space-y-6">
            {/* Credential selector (if node requires it) */}
            {requiredCredentialTypes && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-gray-300">Authentification</h4>
                  <div className="h-px flex-1 bg-gray-700" />
                </div>
                <CredentialSelector
                  label="Identifiants"
                  description="Sélectionnez les identifiants à utiliser"
                  credentialType={requiredCredentialTypes}
                  value={selectedNode.data.credentialId}
                  onChange={handleCredentialChange}
                />
              </div>
            )}

            {/* Inputs dynamiques */}
            {nodeDefinition?.inputs && nodeDefinition.inputs.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-gray-300">Configuration</h4>
                  <div className="h-px flex-1 bg-gray-700" />
                </div>
                {nodeDefinition.inputs.map((input) => (
                  <NodeInput
                    key={input.name}
                    input={input}
                    value={selectedNode.data.config?.[input.name] ?? input.default}
                    onChange={(value) => handleConfigChange(input.name, value)}
                    availableVariables={availableVariables}
                  />
                ))}
              </div>
            ) : nodeDefinition ? (
              <div className="rounded-lg bg-gray-800/50 p-4 text-center">
                <p className="text-sm text-gray-500">
                  Ce node n'a pas de propriétés configurables.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}

            {/* Info sur les sorties */}
            {nodeDefinition?.outputs && nodeDefinition.outputs.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-gray-300">Sorties</h4>
                  <div className="h-px flex-1 bg-gray-700" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {nodeDefinition.outputs.map((output) => (
                    <div
                      key={output.name}
                      className="rounded-lg bg-gray-800/50 p-3 border border-gray-700"
                      style={{ borderLeftColor: output.color, borderLeftWidth: 3 }}
                    >
                      <span className="text-sm font-medium text-white">{output.label || output.name}</span>
                      {output.description && (
                        <p className="mt-1 text-xs text-gray-500">{output.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Variables hint */}
            {availableVariables.length > 0 && (
              <div className="rounded-lg bg-purple-900/30 border border-purple-700 p-3">
                <div className="flex items-center gap-2 text-purple-400">
                  <Variable className="h-4 w-4" />
                  <span className="text-sm font-medium">Variables disponibles</span>
                </div>
                <p className="mt-1 text-xs text-purple-300/70">
                  Tapez <code className="bg-purple-900/50 px-1 rounded">{'{{'}</code> dans un champ pour voir les variables disponibles.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface NodeInputProps {
  input: InputDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  availableVariables: VariableOption[];
}

function NodeInput({ input, value, onChange, availableVariables }: NodeInputProps) {
  const [localValue, setLocalValue] = useState<string>(
    typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '')
  );

  useEffect(() => {
    setLocalValue(
      typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '')
    );
  }, [value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
  };

  const handleBlur = () => {
    let parsedValue: unknown = localValue;

    if (input.type === 'number') {
      parsedValue = Number(localValue);
    } else if (input.type === 'boolean') {
      parsedValue = localValue === 'true';
    } else if (input.type === 'json' || input.type === 'keyValue') {
      try {
        parsedValue = JSON.parse(localValue);
      } catch {
        // Keep as string if invalid JSON
      }
    }

    onChange(parsedValue);
  };

  const handleVariableChange = (newValue: string) => {
    setLocalValue(newValue);
    onChange(newValue);
  };

  const supportsVariables = ['string', 'text', 'url', 'code'].includes(input.type);

  const selectClassName = "flex h-9 w-full rounded-md border border-gray-700 bg-gray-800/50 px-3 py-1 text-sm text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary";
  const inputClassName = "bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500";

  return (
    <div className="space-y-1.5">
      <Label htmlFor={input.name} className="text-sm text-gray-300">
        {input.label}
        {input.required && <span className="ml-1 text-red-400">*</span>}
      </Label>

      {input.type === 'select' && input.options ? (
        <select
          id={input.name}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className={selectClassName}
        >
          <option value="">Sélectionner...</option>
          {input.options.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : input.type === 'boolean' ? (
        <select
          id={input.name}
          value={String(value ?? 'false')}
          onChange={(e) => onChange(e.target.value === 'true')}
          className={selectClassName}
        >
          <option value="false">Non</option>
          <option value="true">Oui</option>
        </select>
      ) : input.type === 'code' || input.type === 'json' ? (
        <textarea
          id={input.name}
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={input.placeholder}
          rows={4}
          className="flex min-h-[100px] w-full rounded-md border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm font-mono text-white shadow-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        />
      ) : input.type === 'number' ? (
        <Input
          id={input.name}
          type="number"
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={input.placeholder}
          className={inputClassName}
        />
      ) : supportsVariables ? (
        <VariablePicker
          value={localValue}
          onChange={handleVariableChange}
          placeholder={input.placeholder}
          availableVariables={availableVariables}
        />
      ) : (
        <Input
          id={input.name}
          type="text"
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={input.placeholder}
          className={inputClassName}
        />
      )}

      {input.description && (
        <p className="text-xs text-gray-500">{input.description}</p>
      )}
    </div>
  );
}
