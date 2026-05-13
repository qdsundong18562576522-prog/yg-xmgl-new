import request from './request';

export const expenseRequestsApi = {
  findAll: (projectId?: number) => request.get('/expense-requests', { params: { projectId: projectId || undefined } }),
  findOne: (id: number) => request.get(`/expense-requests/${id}`),
  create: (data: any) => request.post('/expense-requests', data),
  submit: (id: number) => request.post(`/expense-requests/${id}/submit`),
  approveLeader: (id: number) => request.post(`/expense-requests/${id}/approve-leader`),
  approveFinance: (id: number) => request.post(`/expense-requests/${id}/approve-finance`),
  reject: (id: number, comment?: string) => request.post(`/expense-requests/${id}/reject`, { comment }),
  delete: (id: number) => request.delete(`/expense-requests/${id}`),
};

export const reimbursementsApi = {
  findAll: (projectId?: number) => request.get('/reimbursements', { params: { projectId: projectId || undefined } }),
  findOne: (id: number) => request.get(`/reimbursements/${id}`),
  create: (data: any) => request.post('/reimbursements', data),
  submit: (id: number) => request.post(`/reimbursements/${id}/submit`),
  approvePm: (id: number) => request.post(`/reimbursements/${id}/approve-pm`),
  approveLeader: (id: number) => request.post(`/reimbursements/${id}/approve-leader`),
  approveFinance: (id: number) => request.post(`/reimbursements/${id}/approve-finance`),
  reject: (id: number, comment?: string) => request.post(`/reimbursements/${id}/reject`, { comment }),
  delete: (id: number) => request.delete(`/reimbursements/${id}`),
};

export const contractVariationsApi = {
  findAll: (projectId?: number) => request.get('/contract-variations', { params: { projectId: projectId || undefined } }),
  findOne: (id: number) => request.get(`/contract-variations/${id}`),
  create: (data: any) => request.post('/contract-variations', data),
  submit: (id: number) => request.post(`/contract-variations/${id}/submit`),
  approve: (id: number) => request.post(`/contract-variations/${id}/approve`),
  reject: (id: number, comment?: string) => request.post(`/contract-variations/${id}/reject`, { comment }),
};

export const laborContractsApi = {
  findAll: (projectId?: number) => request.get('/labor-contracts', { params: { projectId: projectId || undefined } }),
  findOne: (id: number) => request.get(`/labor-contracts/${id}`),
  create: (data: any) => request.post('/labor-contracts', data),
  submit: (id: number) => request.post(`/labor-contracts/${id}/submit`),
  approvePm: (id: number) => request.post(`/labor-contracts/${id}/approve-pm`),
  approveLeader: (id: number) => request.post(`/labor-contracts/${id}/approve-leader`),
  reject: (id: number, comment?: string) => request.post(`/labor-contracts/${id}/reject`, { comment }),
};

export const laborVisasApi = {
  findAll: (laborContractId?: number) => request.get('/labor-visas', { params: { laborContractId: laborContractId || undefined } }),
  findOne: (id: number) => request.get(`/labor-visas/${id}`),
  create: (data: any) => request.post('/labor-visas', data),
  submit: (id: number) => request.post(`/labor-visas/${id}/submit`),
  approve: (id: number) => request.post(`/labor-visas/${id}/approve`),
  reject: (id: number, comment?: string) => request.post(`/labor-visas/${id}/reject`, { comment }),
};
