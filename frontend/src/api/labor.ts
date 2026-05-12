import request from './request';

export const laborContractsApi = {
  findAll: (projectId?: number) => request.get('/labor-contracts', { params: { projectId: projectId || undefined } }),
  findOne: (id: number) => request.get(`/labor-contracts/${id}`),
  create: (data: any) => request.post('/labor-contracts', data),
  submit: (id: number) => request.post(`/labor-contracts/${id}/submit`),
  withdraw: (id: number) => request.post(`/labor-contracts/${id}/withdraw`),
  approvePm: (id: number) => request.post(`/labor-contracts/${id}/approve-pm`),
  approveLeader: (id: number) => request.post(`/labor-contracts/${id}/approve-leader`),
  reject: (id: number, comment?: string) => request.post(`/labor-contracts/${id}/reject`, { comment }),
};

export const laborVisasApi = {
  findAll: (laborContractId?: number) => request.get('/labor-visas', { params: { laborContractId: laborContractId || undefined } }),
  findOne: (id: number) => request.get(`/labor-visas/${id}`),
  create: (data: any) => request.post('/labor-visas', data),
  submit: (id: number) => request.post(`/labor-visas/${id}/submit`),
  withdraw: (id: number) => request.post(`/labor-visas/${id}/withdraw`),
  approve: (id: number) => request.post(`/labor-visas/${id}/approve`),
  reject: (id: number, comment?: string) => request.post(`/labor-visas/${id}/reject`, { comment }),
};
