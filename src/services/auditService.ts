

import { supabase } from '@/integrations/supabase/client';
import type { AuditLogEntry, AppError, ServiceResult, PaginationParams, PaginatedResult } from '@/lib/types';

function mapError(error: { message: string; code?: string }): AppError {
  if (error.code === '42501') return { code: 'FORBIDDEN', message: 'Admin access required.' };
  return { code: 'UNKNOWN', message: error.message };
}

export const auditService = {
  async list(
    filters?: {
      tableName?: string;
      userId?: string;
      operation?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    pagination?: PaginationParams,
  ): Promise<ServiceResult<PaginatedResult<AuditLogEntry>>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    return {
      data: {
        data: [],
        count: 0,
        page,
        pageSize,
      },
      error: null,
    };
  },
};
