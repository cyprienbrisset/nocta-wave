'use client';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
  type PanelImperativeHandle,
} from 'react-resizable-panels';
import { cn } from '@/lib/utils';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  GripHorizontal,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Panel layout storage key
const PANEL_LAYOUT_KEY = 'ws-flows-panel-layout';

interface PanelConfig {
  id: string;
  defaultSize: number;
  minSize: number;
  maxSize?: number;
  collapsible?: boolean;
  collapsed?: boolean;
}

interface SavedLayout {
  mainHorizontalSizes: number[];
  bottomVerticalSizes: number[];
  rightPanelSizes: number[];
  collapsedPanels: string[];
}

// Load saved layout from localStorage
function loadSavedLayout(): SavedLayout | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(PANEL_LAYOUT_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

// Save layout to localStorage
function saveLayout(layout: SavedLayout) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PANEL_LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    // Ignore storage errors
  }
}

// Resize handle component
interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  className?: string;
}

export function ResizeHandle({ direction, className }: ResizeHandleProps) {
  const isHorizontal = direction === 'horizontal';

  return (
    <PanelResizeHandle
      className={cn(
        'group relative flex items-center justify-center transition-colors',
        isHorizontal
          ? 'h-full w-1.5 cursor-col-resize hover:bg-primary/30'
          : 'h-1.5 w-full cursor-row-resize hover:bg-primary/30',
        'bg-gray-800/50 hover:bg-primary/20',
        className
      )}
    >
      {/* Visual indicator */}
      <div
        className={cn(
          'absolute rounded-full bg-gray-600 opacity-0 transition-opacity group-hover:opacity-100 group-active:bg-primary',
          isHorizontal ? 'h-8 w-1' : 'h-1 w-8'
        )}
      />
    </PanelResizeHandle>
  );
}

// Collapsible panel header
interface PanelHeaderProps {
  title: string;
  icon?: ReactNode;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
  actions?: ReactNode;
  direction?: 'horizontal' | 'vertical';
}

export function PanelHeader({
  title,
  icon,
  isCollapsed,
  onToggleCollapse,
  onClose,
  onMaximize,
  isMaximized,
  actions,
  direction = 'horizontal',
}: PanelHeaderProps) {
  const CollapseIcon =
    direction === 'horizontal'
      ? isCollapsed
        ? ChevronLeft
        : ChevronRight
      : isCollapsed
        ? ChevronUp
        : ChevronDown;

  return (
    <div className="flex h-8 items-center justify-between border-b border-gray-800 bg-[#1a1a2e] px-2">
      <div className="flex items-center gap-2">
        {icon && <span className="text-gray-400">{icon}</span>}
        <span className="text-xs font-medium text-gray-300">{title}</span>
      </div>
      <div className="flex items-center gap-1">
        {actions}
        {onMaximize && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-gray-500 hover:bg-gray-800 hover:text-gray-300"
            onClick={onMaximize}
          >
            {isMaximized ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
        )}
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-gray-500 hover:bg-gray-800 hover:text-gray-300"
            onClick={onToggleCollapse}
          >
            <CollapseIcon className="h-3 w-3" />
          </Button>
        )}
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-gray-500 hover:bg-gray-800 hover:text-red-400"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Dockable Panel wrapper
interface DockablePanelProps {
  id: string;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  isVisible: boolean;
  onClose: () => void;
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  collapsible?: boolean;
  headerActions?: ReactNode;
  className?: string;
  panelRef?: React.RefObject<PanelImperativeHandle | null>;
}

export function DockablePanel({
  id,
  title,
  icon,
  children,
  isVisible,
  onClose,
  defaultSize = 30,
  minSize = 10,
  maxSize = 80,
  collapsible = true,
  headerActions,
  className,
  panelRef,
}: DockablePanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!isVisible) return null;

  return (
    <Panel
      id={id}
      panelRef={panelRef as any}
      defaultSize={defaultSize}
      minSize={isCollapsed ? 3 : minSize}
      maxSize={maxSize}
      collapsible={collapsible}
      className={cn('flex flex-col bg-[#0f0f1a]', className)}
    >
      <PanelHeader
        title={title}
        icon={icon}
        isCollapsed={isCollapsed}
        onToggleCollapse={
          collapsible
            ? () => {
                if (panelRef?.current) {
                  if (isCollapsed) {
                    panelRef.current.expand();
                  } else {
                    panelRef.current.collapse();
                  }
                }
                setIsCollapsed(!isCollapsed);
              }
            : undefined
        }
        onClose={onClose}
        actions={headerActions}
        direction="vertical"
      />
      {!isCollapsed && <div className="flex-1 overflow-auto">{children}</div>}
    </Panel>
  );
}

// Main editor layout with dockable panels
interface EditorPanelLayoutProps {
  // Main canvas content
  canvas: ReactNode;

  // Right panels
  libraryPanel?: ReactNode;
  isLibraryVisible?: boolean;
  onCloseLibrary?: () => void;

  propertiesPanel?: ReactNode;
  isPropertiesVisible?: boolean;
  onCloseProperties?: () => void;

  dataInspectorPanel?: ReactNode;
  isDataInspectorVisible?: boolean;
  onCloseDataInspector?: () => void;

  // Bottom panels
  consolePanel?: ReactNode;
  isConsoleVisible?: boolean;
  onCloseConsole?: () => void;

  executionPanel?: ReactNode;
  isExecutionVisible?: boolean;
  onCloseExecution?: () => void;
}

export function EditorPanelLayout({
  canvas,
  libraryPanel,
  isLibraryVisible = false,
  onCloseLibrary,
  propertiesPanel,
  isPropertiesVisible = false,
  onCloseProperties,
  dataInspectorPanel,
  isDataInspectorVisible = false,
  onCloseDataInspector,
  consolePanel,
  isConsoleVisible = false,
  onCloseConsole,
  executionPanel,
  isExecutionVisible = false,
  onCloseExecution,
}: EditorPanelLayoutProps) {
  const [savedLayout, setSavedLayout] = useState<SavedLayout | null>(null);

  // Load saved layout on mount
  useEffect(() => {
    setSavedLayout(loadSavedLayout());
  }, []);

  // Check if any right panel is visible
  const hasRightPanels =
    isLibraryVisible || isPropertiesVisible || isDataInspectorVisible;

  // Check if any bottom panel is visible
  const hasBottomPanels = isConsoleVisible || isExecutionVisible;

  // Handle layout changes
  const handleLayoutChange = useCallback(
    (sizes: number[], type: 'main' | 'bottom' | 'right') => {
      const currentLayout = loadSavedLayout() || {
        mainHorizontalSizes: [70, 30],
        bottomVerticalSizes: [70, 30],
        rightPanelSizes: [50, 50],
        collapsedPanels: [],
      };

      if (type === 'main') {
        currentLayout.mainHorizontalSizes = sizes;
      } else if (type === 'bottom') {
        currentLayout.bottomVerticalSizes = sizes;
      } else if (type === 'right') {
        currentLayout.rightPanelSizes = sizes;
      }

      saveLayout(currentLayout);
    },
    []
  );

  return (
    <div className="flex h-full w-full flex-col">
      {/* Main horizontal layout: Canvas | Right Panels */}
      <PanelGroup
        orientation="horizontal"
        className="flex-1"
        onLayoutChange={(sizes) => handleLayoutChange(Object.values(sizes), 'main')}
      >
        {/* Left side: Canvas + Bottom panels */}
        <Panel
          defaultSize={hasRightPanels ? 70 : 100}
          minSize={40}
          className="flex flex-col"
        >
          <PanelGroup
            orientation="vertical"
            onLayoutChange={(sizes) => handleLayoutChange(Object.values(sizes), 'bottom')}
          >
            {/* Canvas area */}
            <Panel defaultSize={hasBottomPanels ? 65 : 100} minSize={30}>
              <div className="h-full w-full">{canvas}</div>
            </Panel>

            {/* Bottom panels (Console, Execution) */}
            {hasBottomPanels && (
              <>
                <ResizeHandle direction="vertical" />
                <Panel
                  defaultSize={35}
                  minSize={15}
                  maxSize={60}
                  collapsible
                  className="flex flex-col"
                >
                  {/* Bottom panel tabs if multiple are visible */}
                  {isConsoleVisible && isExecutionVisible ? (
                    <BottomPanelTabs
                      consolePanel={consolePanel}
                      executionPanel={executionPanel}
                      onCloseConsole={onCloseConsole}
                      onCloseExecution={onCloseExecution}
                    />
                  ) : (
                    <div className="h-full">
                      {isConsoleVisible && consolePanel}
                      {isExecutionVisible && executionPanel}
                    </div>
                  )}
                </Panel>
              </>
            )}
          </PanelGroup>
        </Panel>

        {/* Right panels (Library, Properties, Data Inspector) */}
        {hasRightPanels && (
          <>
            <ResizeHandle direction="horizontal" />
            <Panel defaultSize={30} minSize={15} maxSize={50}>
              <PanelGroup
                orientation="vertical"
                onLayoutChange={(sizes) => handleLayoutChange(Object.values(sizes), 'right')}
              >
                {/* Stack right panels vertically */}
                {isLibraryVisible && libraryPanel && (
                  <>
                    <Panel defaultSize={100} minSize={20}>
                      {libraryPanel}
                    </Panel>
                  </>
                )}

                {isPropertiesVisible && propertiesPanel && (
                  <>
                    {isLibraryVisible && <ResizeHandle direction="vertical" />}
                    <Panel defaultSize={50} minSize={20}>
                      {propertiesPanel}
                    </Panel>
                  </>
                )}

                {isDataInspectorVisible && dataInspectorPanel && (
                  <>
                    {(isLibraryVisible || isPropertiesVisible) && (
                      <ResizeHandle direction="vertical" />
                    )}
                    <Panel defaultSize={50} minSize={20}>
                      {dataInspectorPanel}
                    </Panel>
                  </>
                )}
              </PanelGroup>
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
}

// Bottom panel tabs component
interface BottomPanelTabsProps {
  consolePanel?: ReactNode;
  executionPanel?: ReactNode;
  onCloseConsole?: () => void;
  onCloseExecution?: () => void;
}

function BottomPanelTabs({
  consolePanel,
  executionPanel,
  onCloseConsole,
  onCloseExecution,
}: BottomPanelTabsProps) {
  const [activeTab, setActiveTab] = useState<'console' | 'execution'>('console');

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex h-8 items-center gap-1 border-b border-gray-800 bg-[#1a1a2e] px-2">
        {consolePanel && (
          <button
            onClick={() => setActiveTab('console')}
            className={cn(
              'flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors',
              activeTab === 'console'
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'
            )}
          >
            Console
            {onCloseConsole && (
              <X
                className="h-3 w-3 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseConsole();
                }}
              />
            )}
          </button>
        )}
        {executionPanel && (
          <button
            onClick={() => setActiveTab('execution')}
            className={cn(
              'flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors',
              activeTab === 'execution'
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'
            )}
          >
            Exécution
            {onCloseExecution && (
              <X
                className="h-3 w-3 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseExecution();
                }}
              />
            )}
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'console' && consolePanel}
        {activeTab === 'execution' && executionPanel}
      </div>
    </div>
  );
}

export default EditorPanelLayout;
