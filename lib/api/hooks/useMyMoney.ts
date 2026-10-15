import { useQuery } from '@tanstack/react-query';
import { staffService } from '../services/staff.service';

/**
 * What the signed-in person took today, by method. Staff count their cash
 * against it at the end of the day, so it stays fresh while My Sales is open.
 */
export const useMyMoney = () => {
  return useQuery({
    queryKey: ['my-money'],
    queryFn: staffService.myMoney,
    refetchInterval: 30000,
  });
};
