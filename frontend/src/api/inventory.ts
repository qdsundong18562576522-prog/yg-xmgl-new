import request from './request';

export const companyInventoryApi = {
  findAll: () => request.get('/company-inventory'),
  create: (data: any) => request.post('/company-inventory', data),
  update: (id: number, data: any) => request.put(`/company-inventory/${id}`, data),
  delete: (id: number) => request.delete(`/company-inventory/${id}`),
};

export const projectInventoryApi = {
  findByProject: (projectId?: number) => request.get('/project-inventory', { params: { projectId: projectId || undefined } }),
};

export const stockOutApi = {
  findAll: (projectId?: number) => request.get('/stock-out', { params: { projectId: projectId || undefined } }),
  findOne: (id: number) => request.get(`/stock-out/${id}`),
  create: (data: any) => request.post('/stock-out', data),
  approveLeader: (id: number) => request.post(`/stock-out/${id}/approve-leader`),
  approvePurchaser: (id: number) => request.post(`/stock-out/${id}/approve-purchaser`),
  reject: (id: number, comment?: string) => request.post(`/stock-out/${id}/reject`, { comment }),
};

export const materialRequisitionsApi = {
  findAll: (projectId?: number) => request.get('/material-requisitions', { params: { projectId: projectId || undefined } }),
  create: (data: any) => request.post('/material-requisitions', data),
  submit: (id: number) => request.post(`/material-requisitions/${id}/submit`),
  approvePurchaser: (id: number) => request.post(`/material-requisitions/${id}/approve-purchaser`),
  approveLeader: (id: number) => request.post(`/material-requisitions/${id}/approve-leader`),
  reject: (id: number, comment?: string) => request.post(`/material-requisitions/${id}/reject`, { comment }),
};
