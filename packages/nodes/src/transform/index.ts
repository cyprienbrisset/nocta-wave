export { setNode } from './set';
export { mapNode } from './map';
export { filterNode } from './filter';
export { mergeNode } from './merge';
export { splitNode } from './split';
export { aggregateNode } from './aggregate';
export { sortNode } from './sort';
export { codeNode } from './code';
export { xmlNode } from './xml';
export { yamlNode } from './yaml';
export { base64Node } from './base64';
export { compressNode } from './compress';
export { templateNode } from './template';
export { diffNode } from './diff';

import { setNode } from './set';
import { mapNode } from './map';
import { filterNode } from './filter';
import { mergeNode } from './merge';
import { splitNode } from './split';
import { aggregateNode } from './aggregate';
import { sortNode } from './sort';
import { codeNode } from './code';
import { xmlNode } from './xml';
import { yamlNode } from './yaml';
import { base64Node } from './base64';
import { compressNode } from './compress';
import { templateNode } from './template';
import { diffNode } from './diff';
import type { NodeDefinition } from '@ws-flows/shared';

export const transformNodes: NodeDefinition[] = [
  setNode,
  mapNode,
  filterNode,
  mergeNode,
  splitNode,
  aggregateNode,
  sortNode,
  codeNode,
  xmlNode,
  yamlNode,
  base64Node,
  compressNode,
  templateNode,
  diffNode,
];
