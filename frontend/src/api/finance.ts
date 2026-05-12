import request from './request';

export const paymentRequestsApi = {
  findAll: (projectId?: number) => request.get('/payment-requests', { params: { projectId: projectId || undefined } }),
  findOne: (id: number) => request.get(`/payment-requests/${id}`),
  create: (data: any) => request.post('/payment-requests', data),
  submit: (id: number) => request.post(`/payment-requests/${id}/submit`),
  withdraw: (id: number) => request.post(`/payment-requests/${id}/withdraw`),
  approveLeader: (id: number) => request.post(`/payment-requests/${id}/approve-leader`),
  approveFinance: (id: number) => request.post(`/payment-requests/${id}/approve-finance`),
  reject: (id: number, comment?: string) => request.post(`/payment-requests/${id}/reject`, { comment }),
  confirmPay: (id: number, data?: any) => request.post(`/payment-requests/${id}/confirm-pay`, data || {}),
};

export const projectReceivablesApi = {
  findAll: (projectId?: number) => request.get('/project-receivables', { params: { projectId: projectId || undefined } }),
  findOne: (id: number) => request.get(`/project-receivables/${id}`),
  create: (data: any) => request.post('/project-receivables', data),
};
