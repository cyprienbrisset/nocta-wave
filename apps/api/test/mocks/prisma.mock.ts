/**
 * Prisma Mock for Testing
 *
 * This creates a mock Prisma client that can be used in unit tests
 * to avoid hitting the real database.
 */
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

export type MockPrismaClient = DeepMockProxy<PrismaClient>;

// Create the mock
export const prismaMock = mockDeep<PrismaClient>() as MockPrismaClient;

// Reset all mocks between tests
beforeEach(() => {
  mockReset(prismaMock);
});

/**
 * Helper to mock Prisma responses
 */
export const mockPrismaResponse = {
  workflow: {
    findUnique: (data: any) => prismaMock.workflow.findUnique.mockResolvedValue(data),
    findMany: (data: any[]) => prismaMock.workflow.findMany.mockResolvedValue(data),
    create: (data: any) => prismaMock.workflow.create.mockResolvedValue(data),
    update: (data: any) => prismaMock.workflow.update.mockResolvedValue(data),
    delete: (data: any) => prismaMock.workflow.delete.mockResolvedValue(data),
  },
  user: {
    findUnique: (data: any) => prismaMock.user.findUnique.mockResolvedValue(data),
    findMany: (data: any[]) => prismaMock.user.findMany.mockResolvedValue(data),
    create: (data: any) => prismaMock.user.create.mockResolvedValue(data),
    update: (data: any) => prismaMock.user.update.mockResolvedValue(data),
  },
  execution: {
    findUnique: (data: any) => prismaMock.workflowExecution.findUnique.mockResolvedValue(data),
    findMany: (data: any[]) => prismaMock.workflowExecution.findMany.mockResolvedValue(data),
    create: (data: any) => prismaMock.workflowExecution.create.mockResolvedValue(data),
    update: (data: any) => prismaMock.workflowExecution.update.mockResolvedValue(data),
  },
  team: {
    findUnique: (data: any) => prismaMock.team.findUnique.mockResolvedValue(data),
    findMany: (data: any[]) => prismaMock.team.findMany.mockResolvedValue(data),
  },
};
