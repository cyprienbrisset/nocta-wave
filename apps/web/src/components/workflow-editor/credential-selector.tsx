'use client';

import { useQuery } from '@tanstack/react-query';
import { Key, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { credentialsApi, type CredentialType } from '@/lib/api/credentials';
import { cn } from '@/lib/utils';

interface CredentialSelectorProps {
  label: string;
  description?: string;
  required?: boolean;
  credentialType?: CredentialType | CredentialType[];
  value?: string;
  onChange: (credentialId: string | null) => void;
}

const credentialTypeLabels: Record<CredentialType, string> = {
  API_KEY: 'Clé API',
  OAUTH2: 'OAuth2',
  BASIC_AUTH: 'Auth basique',
  DATABASE: 'Base de données',
  AWS: 'AWS',
};

export function CredentialSelector({
  label,
  description,
  required,
  credentialType,
  value,
  onChange,
}: CredentialSelectorProps) {
  const { data: credentials, isLoading, error } = useQuery({
    queryKey: ['credentials'],
    queryFn: credentialsApi.list,
  });

  // Filtrer les credentials par type si spécifié
  const filteredCredentials = credentials?.filter((cred) => {
    if (!credentialType) return true;
    if (Array.isArray(credentialType)) {
      return credentialType.includes(cred.type);
    }
    return cred.type === credentialType;
  }) ?? [];

  const selectedCredential = filteredCredentials.find((c) => c.id === value);

  if (isLoading) {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-gray-400">
          {label}
          {required && <span className="ml-1 text-red-400">*</span>}
        </Label>
        <div className="flex h-9 items-center justify-center rounded-md border border-gray-700 bg-gray-800/50">
          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-gray-400">
          {label}
          {required && <span className="ml-1 text-red-400">*</span>}
        </Label>
        <div className="flex h-9 items-center gap-2 rounded-md border border-red-800 bg-red-900/20 px-3">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <span className="text-xs text-red-400">Erreur de chargement</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-400">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </Label>

      <div className="flex gap-2">
        <Select
          value={value || '__none__'}
          onValueChange={(val) => onChange(val === '__none__' ? null : val)}
        >
          <SelectTrigger className={cn(
            'flex-1 bg-gray-800/50 border-gray-700 text-white',
            !value && 'text-gray-500'
          )}>
            <SelectValue placeholder="Sélectionner un identifiant...">
              {selectedCredential ? (
                <div className="flex items-center gap-2">
                  <Key className="h-3.5 w-3.5 text-primary" />
                  <span>{selectedCredential.name}</span>
                  <span className="text-xs text-gray-500">
                    ({credentialTypeLabels[selectedCredential.type]})
                  </span>
                </div>
              ) : (
                'Sélectionner un identifiant...'
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-[#1e1e2e] border-gray-700">
            {filteredCredentials.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                <Key className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>Aucun identifiant disponible</p>
                {credentialType && (
                  <p className="text-xs mt-1">
                    Type requis: {Array.isArray(credentialType)
                      ? credentialType.map(t => credentialTypeLabels[t]).join(', ')
                      : credentialTypeLabels[credentialType]
                    }
                  </p>
                )}
              </div>
            ) : (
              <>
                <SelectItem value="__none__" className="text-gray-500">
                  Aucun
                </SelectItem>
                {filteredCredentials.map((credential) => (
                  <SelectItem key={credential.id} value={credential.id} className="text-white">
                    <div className="flex items-center gap-2">
                      <Key className="h-3.5 w-3.5 text-gray-400" />
                      <span>{credential.name}</span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {credentialTypeLabels[credential.type]}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white"
          onClick={() => window.open('/credentials', '_blank')}
          title="Ajouter un nouvel identifiant"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
}
