export { conditionNode } from './condition';
export { switchNode } from './switch';
export { loopNode } from './loop';
export { waitNode } from './wait';
export { stopNode } from './stop';

import { conditionNode } from './condition';
import { switchNode } from './switch';
import { loopNode } from './loop';
import { waitNode } from './wait';
import { stopNode } from './stop';
import type { NodeDefinition } from '@ws-flows/shared';

export const logicNodes: NodeDefinition[] = [
  conditionNode,
  switchNode,
  loopNode,
  waitNode,
  stopNode,
];
