'use client';

import { useState, useRef } from 'react';
import { workflowsApi } from '@/lib/api/workflows';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, Copy, Check, FileJson, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface ImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId?: string;
  onImportSuccess?: (workflowId: string) => void;
}

export function ImportExportDialog({
  open,
  onOpenChange,
  workflowId,
  onImportSuccess,
}: ImportExportDialogProps) {
  const [tab, setTab] = useState<'export' | 'import'>(workflowId ? 'export' : 'import');
  const [exportData, setExportData] = useState<string>('');
  const [importData, setImportData] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    if (!workflowId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await workflowsApi.exportWorkflow(workflowId);
      setExportData(JSON.stringify(data, null, 2));
    } catch (err) {
      setError('Erreur lors de l\'export du workflow');
      console.error('Export error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copié dans le presse-papiers', duration: 2000 });
    } catch {
      toast({ title: 'Erreur lors de la copie', variant: 'destructive' });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-${workflowId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Fichier téléchargé', duration: 2000 });
  };

  const handleImport = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = JSON.parse(importData);

      if (!data.workflow || !data.workflow.graph) {
        throw new Error('Format de workflow invalide');
      }

      const result = await workflowsApi.importWorkflow(data);
      toast({ title: 'Workflow importé avec succès', duration: 2000 });
      onImportSuccess?.(result.id);
      onOpenChange(false);
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setError('JSON invalide');
      } else {
        setError(err.message || 'Erreur lors de l\'import');
      }
      console.error('Import error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportData(content);
      setError(null);
    };
    reader.onerror = () => {
      setError('Erreur lors de la lecture du fichier');
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-indigo-400" />
            Import / Export de Workflow
          </DialogTitle>
          <DialogDescription>
            Partagez vos workflows en les exportant au format JSON, ou importez des workflows existants.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v: string) => setTab(v as 'export' | 'import')} className="mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger
              value="export"
              disabled={!workflowId}
              className="data-[state=active]:bg-gray-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </TabsTrigger>
            <TabsTrigger value="import" className="data-[state=active]:bg-gray-700">
              <Upload className="h-4 w-4 mr-2" />
              Importer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="mt-4 space-y-4">
            {!exportData ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <FileJson className="h-12 w-12 text-gray-600" />
                <p className="text-gray-400 text-center">
                  Exportez ce workflow pour le partager ou le sauvegarder.
                </p>
                <Button onClick={handleExport} disabled={loading}>
                  {loading ? 'Génération...' : 'Générer le JSON'}
                </Button>
              </div>
            ) : (
              <>
                <Textarea
                  value={exportData}
                  readOnly
                  className="h-64 font-mono text-xs bg-gray-800 border-gray-700"
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleCopy}>
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-green-400" />
                        Copié !
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copier
                      </>
                    )}
                  </Button>
                  <Button className="flex-1" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="import" className="mt-4 space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-gray-400 mb-2 block">
                  Importez depuis un fichier
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full border-dashed h-20"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center">
                    <Upload className="h-6 w-6 mb-1" />
                    <span>Cliquez pour sélectionner un fichier</span>
                  </div>
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-gray-900 px-2 text-gray-500">ou collez le JSON</span>
                </div>
              </div>

              <Textarea
                value={importData}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  setImportData(e.target.value);
                  setError(null);
                }}
                placeholder='{"version": "1.0", "workflow": {...}}'
                className={cn(
                  'h-48 font-mono text-xs bg-gray-800 border-gray-700',
                  error && 'border-red-500'
                )}
              />

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleImport}
                disabled={!importData.trim() || loading}
              >
                {loading ? 'Importation...' : 'Importer le workflow'}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
