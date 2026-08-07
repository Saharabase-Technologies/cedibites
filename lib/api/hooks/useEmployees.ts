import { useQuery } from '@tanstack/react-query';
import { employeeService, type EmployeeListParams } from '../services/employee.service';

export function useEmployees(params?: EmployeeListParams) {
  const { data: employees = [], isLoading, error, refetch } = useQuery({
    queryKey: ['employees', params],
    queryFn: () => employeeService.getEmployees(params),
  });

  return { employees, isLoading, error, refetch };
}
