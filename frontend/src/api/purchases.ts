import request from './request';

// Purchase Requests API
export const purchaseRequestsApi = {
  findAll: (projectId?: number) => request.get('/purchase-requests', { params: { projectId: projectId || undefined } }),
  findOne: (id: number) => request.get(`/purchase-requests/${id}`),
  create: (data: any) => request.post('/purchase-requests', data),
  update: (id: number, data: any) => request.put(`/purchase-requests/${id}`, data),
  delete: (id: number) => request.delete(`/purchase-requests/${id}`),
  submit: (id: number) => request.post(`/purchase-requests/${id}/submit`),
  withdraw: (id: number) => request.post(`/purchase-requests/${id}/withdraw`),
  approve: (id: number) => request.post(`/purchase-requests/${id}/approve`),
  reject: (id: number, comment?: string) => request.post(`/purchase-requests/${id}/reject`, { comment }),
  confirm: (id: number) => request.post(`/purchase-requests/${id}/confirm`),
};

// Inquiry Orders API
export const inquiryOrdersApi = {
  findAll: (projectId?: number) => request.get('/inquiry-orders', { params: { projectId: projectId || undefined } }),
  findOne: (id: number) => request.get(`/inquiry-orders/${id}`),
  create: (data: any) => request.post('/inquiry-orders', data),
  submit: (id: number) => request.post(`/inquiry-orders/${id}/submit`),
  withdraw: (id: number) => request.post(`/inquiry-orders/${id}/withdraw`),
  approvePm: (id: number) => request.post(`/inquiry-orders/${id}/approve-pm`),
  approveLeader: (id: number) => request.post(`/inquiry-orders/${id}/approve-leader`),
  reject: (id: number, comment?: string) => request.post(`/inquiry-orders/${id}/reject`, { comment }),
  update: (id: number, data: any) => request.put(`/inquiry-orders/${id}`, data),
  delete: (id: number) => request.delete(`/inquiry-orders/${id}`),
};

// Purchase Confirms API
export const purchaseConfirmsApi = {
  findAll: (projectId?: number) => request.get('/purchase-confirms', { params: { projectId: projectId || undefined } }),
  findOne: (id: number) => request.get(`/purchase-confirms/${id}`),
  create: (data: any) => request.post('/purchase-confirms', data),
  submit: (id: number) => request.post(`/purchase-confirms/${id}/submit`),
  withdraw: (id: number) => request.post(`/purchase-confirms/${id}/withdraw`),
  approvePm: (id: number) => request.post(`/purchase-confirms/${id}/approve-pm`),
  approveLeader: (id: number) => request.post(`/purchase-confirms/${id}/approve-leader`),
  reject: (id: number, comment?: string) => request.post(`/purchase-confirms/${id}/reject`, { comment }),
  delete: (id: number) => request.delete(`/purchase-confirms/${id}`),
};

// Delivery Notices API
export const deliveryNoticesApi = {
  findAll: (projectId?: number) => request.get('/delivery-notices', { params: { projectId: projectId || undefined } }),
  findOne: (id: number) => request.get(`/delivery-notices/${id}`),
  create: (data: any) => request.post('/delivery-notices', data),
  submit: (id: number) => request.post(`/delivery-notices/${id}/submit`),
  withdraw: (id: number) => request.post(`/delivery-notices/${id}/withdraw`),
  approvePurchaser: (id: number) => request.post(`/delivery-notices/${id}/approve-purchaser`),
  approveLeader: (id: number) => request.post(`/delivery-notices/${id}/approve-leader`),
  reject: (id: number, comment?: string) => request.post(`/delivery-notices/${id}/reject`, { comment }),
  delete: (id: number) => request.delete(`/delivery-notices/${id}`),
};
