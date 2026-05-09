import request from './request';

export interface Project {
  id: number;
  code: string;
  name: string;
  type: 'integration' | 'supply';
  description?: string;
  contractAmount: number;
  expectedProfitRate?: number;
  projectManagerId: number;
  planStartDate: string;
  planEndDate: string;
  duration?: number;
  remarks?: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  createdAt: string;
  sales: { id: number; displayName: string };
  projectManager: { id: number; displayName: string };
}

export interface CreateProjectData {
  name: string;
  type: 'integration' | 'supply';
  description?: string;
  contractAmount: number;
  expectedProfitRate?: number;
  projectManagerId: number;
  planStartDate: string;
  planEndDate: string;
  remarks?: string;
}

export const projectsApi = {
  findAll: () => request.get<any, { code: number; data: Project[] }>('/projects'),
  findOne: (id: number) => request.get<any, { code: number; data: Project }>(`/projects/${id}`),
  create: (data: CreateProjectData) => request.post<any, { code: number; data: Project }>('/projects', data),
  update: (id: number, data: Partial<CreateProjectData>) => request.put<any, { code: number; data: Project }>(`/projects/${id}`, data),
  submit: (id: number) => request.post<any, { code: number; data: Project }>(`/projects/${id}/submit`),
  approve: (id: number) => request.post<any, { code: number; data: Project }>(`/projects/${id}/approve`),
  reject: (id: number, comment?: string) => request.post<any, { code: number; data: Project }>(`/projects/${id}/reject`, { comment }),
};
