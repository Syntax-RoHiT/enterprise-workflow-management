

import { useQuery } from '@tanstack/react-query';
import { auditService } from '@/services/auditService';
import type { PaginationParams } from '@/lib/types';

export const auditKeys = {
  all: ['audit'] as const,
  list: (filters?: Record<string, unknown>, pagination?: PaginationParams) =>
    [...auditKeys.all, 'list', filters, pagination] as const,
};

export function useAuditLog(
  filters?: {
    tableName?: string;
    userId?: string;
    operation?: string;
    dateFrom?: string;
    dateTo?: string;
  },
  pagination?: PaginationParams,
) {
  return useQuery({
    queryKey: auditKeys.list(filters, pagination),
    queryFn: async () => {
      const result = await auditService.list(filters, pagination);
      if (result.error) throw result.error;
      return result.data!;
    },
    staleTime: 15_000,
  });
}
