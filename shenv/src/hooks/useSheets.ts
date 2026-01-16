/**
 * React Query hooks for sheets data
 */

import { useQuery } from '@tanstack/react-query';
import { fetchSheets, fetchSheetDetails } from '../services/api';
import type { SheetsQueryParams } from '../types';

/**
 * Hook to fetch sheets list
 */
export function useSheets(params: SheetsQueryParams = {}) {
  return useQuery({
    queryKey: ['sheets', params],
    queryFn: () => fetchSheets(params),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch sheet details
 */
export function useSheetDetails(sheetId: string) {
  return useQuery({
    queryKey: ['sheet', sheetId],
    queryFn: () => fetchSheetDetails(sheetId),
    enabled: !!sheetId,
    staleTime: 60000, // 1 minute
  });
}
