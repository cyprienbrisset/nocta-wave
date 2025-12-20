'use client';

import { useState, useMemo } from 'react';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Code,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ExecutionTimeline, ExportFormat, ExportOptions } from '@/types/replay.types';
import { formatExportData } from '@/types/replay.types';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  timeline: ExecutionTimeline;
  selectedStepIds?: string[];
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; icon: typeof FileJson; description: string }[] = [
  {
    value: 'json',
    label: 'JSON',
    icon: FileJson,
    description: 'Structured data format, ideal for importing',
  },
  {
    value: 'csv',
    label: 'CSV',
    icon: FileSpreadsheet,
    description: 'Spreadsheet compatible, for Excel/Sheets',
  },
  {
    value: 'html',
    label: 'HTML Report',
    icon: Code,
    description: 'Visual report, viewable in browser',
  },
  {
    value: 'markdown',
    label: 'Markdown',
    icon: FileText,
    description: 'Documentation format, for GitHub/docs',
  },
];

export function ExportDialog({
  isOpen,
  onClose,
  timeline,
  selectedStepIds = [],
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [includeInputData, setIncludeInputData] = useState(true);
  const [includeOutputData, setIncludeOutputData] = useState(true);
  const [includeErrors, setIncludeErrors] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [prettyPrint, setPrettyPrint] = useState(true);
  const [exportSelected, setExportSelected] = useState(selectedStepIds.length > 0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Preview the export
  const preview = useMemo(() => {
    const options: ExportOptions = {
      format,
      includeInputData,
      includeOutputData,
      includeErrors,
      includeMetadata,
      includeTimestamps,
      prettyPrint,
      selectedSteps: exportSelected ? selectedStepIds : undefined,
    };

    try {
      const result = formatExportData(timeline, options);
      return {
        filename: result.filename,
        size: result.size,
        preview: result.content.slice(0, 500) + (result.content.length > 500 ? '...' : ''),
      };
    } catch (error) {
      return {
        filename: 'error.txt',
        size: 0,
        preview: 'Error generating preview',
      };
    }
  }, [
    timeline,
    format,
    includeInputData,
    includeOutputData,
    includeErrors,
    includeMetadata,
    includeTimestamps,
    prettyPrint,
    exportSelected,
    selectedStepIds,
  ]);

  const handleExport = () => {
    setIsExporting(true);

    const options: ExportOptions = {
      format,
      includeInputData,
      includeOutputData,
      includeErrors,
      includeMetadata,
      includeTimestamps,
      prettyPrint,
      selectedSteps: exportSelected ? selectedStepIds : undefined,
    };

    try {
      const result = formatExportData(timeline, options);

      // Create and download file
      const blob = new Blob([result.content], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div
        className="bg-[#0f0f1a] border border-gray-800 rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#1a1a2e]">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-purple-400" />
            <span className="text-sm font-medium text-white">Export Debug Data</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Format selection */}
          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
              Export Format
            </label>
            <div className="grid grid-cols-4 gap-2">
              {FORMAT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFormat(option.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-lg border transition-all',
                    format === option.value
                      ? 'border-purple-500 bg-purple-900/20'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  )}
                >
                  <option.icon
                    className={cn(
                      'h-6 w-6',
                      format === option.value ? 'text-purple-400' : 'text-gray-400'
                    )}
                  />
                  <span
                    className={cn(
                      'text-xs font-medium',
                      format === option.value ? 'text-white' : 'text-gray-400'
                    )}
                  >
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {FORMAT_OPTIONS.find((o) => o.value === format)?.description}
            </p>
          </div>

          {/* Include options */}
          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
              Include Data
            </label>
            <div className="grid grid-cols-2 gap-2">
              <ToggleOption
                label="Input Data"
                checked={includeInputData}
                onChange={setIncludeInputData}
              />
              <ToggleOption
                label="Output Data"
                checked={includeOutputData}
                onChange={setIncludeOutputData}
              />
              <ToggleOption
                label="Errors"
                checked={includeErrors}
                onChange={setIncludeErrors}
              />
              <ToggleOption
                label="Metadata"
                checked={includeMetadata}
                onChange={setIncludeMetadata}
              />
              <ToggleOption
                label="Timestamps"
                checked={includeTimestamps}
                onChange={setIncludeTimestamps}
              />
              {format === 'json' && (
                <ToggleOption
                  label="Pretty Print"
                  checked={prettyPrint}
                  onChange={setPrettyPrint}
                />
              )}
            </div>
          </div>

          {/* Step selection */}
          {selectedStepIds.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                Steps to Export
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!exportSelected}
                    onChange={() => setExportSelected(false)}
                    className="text-purple-500"
                  />
                  <span className="text-sm text-gray-300">
                    All steps ({timeline.steps.length})
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={exportSelected}
                    onChange={() => setExportSelected(true)}
                    className="text-purple-500"
                  />
                  <span className="text-sm text-gray-300">
                    Selected steps ({selectedStepIds.length})
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Preview
              </label>
              <span className="text-xs text-gray-500">
                {preview.filename} ({formatFileSize(preview.size)})
              </span>
            </div>
            <pre className="p-3 bg-gray-900 rounded-lg text-xs text-gray-300 font-mono overflow-auto max-h-40">
              {preview.preview}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-800 bg-gray-900/50">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-9"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || exportSuccess}
            className={cn(
              'h-9 gap-2',
              exportSuccess ? 'bg-green-600' : 'bg-purple-600 hover:bg-purple-700'
            )}
          >
            {exportSuccess ? (
              <>
                <Check className="h-4 w-4" />
                Exported!
              </>
            ) : isExporting ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToggleOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 p-2 rounded bg-gray-800/50 cursor-pointer hover:bg-gray-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-gray-600 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
      />
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
