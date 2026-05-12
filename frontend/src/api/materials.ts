import request from './request';

export interface Material {
  id: number;
  name: string;
  brand: string;
  spec: string;
  unit: string;
}

export const materialsApi = {
  findAll: (search?: string) => request.get<any, { code: number; data: Material[] }>('/materials', { params: { search } }),
  create: (data: Partial<Material>) => request.post('/materials', data),
  update: (id: number, data: Partial<Material>) => request.put(`/materials/${id}`, data),
  delete: (id: number) => request.delete(`/materials/${id}`),
  batchDelete: (ids: number[]) => request.post('/materials/batch-delete', { ids }),
};
