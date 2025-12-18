export { httpRequest } from './request';
export { httpResponse } from './response';

import { httpRequest } from './request';
import { httpResponse } from './response';
import type { NodeDefinition } from '@ws-flows/shared';

export const httpNodes: NodeDefinition[] = [httpRequest, httpResponse];
