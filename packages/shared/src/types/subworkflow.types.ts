// Sub-Workflow Types

/**
 * Input parameter schema for sub-workflows
 */
export type SchemaItemType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';

export interface InputSchemaItem {
  name: string;
  type: SchemaItemType;
  label: string;
  description?: string;
  required?: boolean;
  default?: unknown;
}

/**
 * Output parameter schema for sub-workflows
 */
export interface OutputSchemaItem {
  name: string;
  type: SchemaItemType;
  label: string;
  description?: string;
}

/**
 * Sub-workflow definition
 */
export interface SubWorkflow {
  id: string;
  workflowId: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  inputSchema: InputSchemaItem[];
  outputSchema: OutputSchemaItem[];
  isPublic: boolean;
  isShared: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating a sub-workflow
 */
export interface CreateSubWorkflowDto {
  workflowId: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  inputSchema: InputSchemaItem[];
  outputSchema: OutputSchemaItem[];
  isPublic?: boolean;
  isShared?: boolean;
}

/**
 * DTO for updating a sub-workflow
 */
export interface UpdateSubWorkflowDto {
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  inputSchema?: InputSchemaItem[];
  outputSchema?: OutputSchemaItem[];
  isPublic?: boolean;
  isShared?: boolean;
}

/**
 * Type guard for InputSchemaItem array
 */
export function isInputSchemaArray(value: unknown): value is InputSchemaItem[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as InputSchemaItem).name === 'string' &&
      typeof (item as InputSchemaItem).type === 'string' &&
      typeof (item as InputSchemaItem).label === 'string'
  );
}

/**
 * Type guard for OutputSchemaItem array
 */
export function isOutputSchemaArray(value: unknown): value is OutputSchemaItem[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as OutputSchemaItem).name === 'string' &&
      typeof (item as OutputSchemaItem).type === 'string' &&
      typeof (item as OutputSchemaItem).label === 'string'
  );
}

/**
 * Safely cast Prisma Json to InputSchemaItem[]
 */
export function toInputSchema(json: unknown): InputSchemaItem[] {
  if (isInputSchemaArray(json)) {
    return json;
  }
  return [];
}

/**
 * Safely cast Prisma Json to OutputSchemaItem[]
 */
export function toOutputSchema(json: unknown): OutputSchemaItem[] {
  if (isOutputSchemaArray(json)) {
    return json;
  }
  return [];
}
