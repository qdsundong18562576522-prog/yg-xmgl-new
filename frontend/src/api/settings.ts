import request from './request';

export const settingsApi = {
  getConfigs: () => request.get('/settings/config'),
  updateConfig: (key: string, value: string) =>
    request.put(`/settings/config/${key}`, { value }),

  getDictTypes: () => request.get('/settings/dict/types'),
  getDictByType: (type: string) => request.get(`/settings/dict/${type}`),
  createDict: (data: any) => request.post('/settings/dict', data),
  updateDict: (id: number, data: any) => request.put(`/settings/dict/${id}`, data),
  deleteDict: (id: number) => request.delete(`/settings/dict/${id}`),
  toggleDict: (id: number) => request.post(`/settings/dict/${id}/toggle`),

  getLogs: (params: any) => request.get('/settings/operation-logs', { params }),
  getLogEntityTypes: () => request.get('/settings/operation-logs/entity-types'),
};
