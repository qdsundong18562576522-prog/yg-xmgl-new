import request from './request';

export const dashboardApi = {
  getStats: () => request.get('/dashboard/stats'),
  getPendingApprovals: () => request.get('/dashboard/pending-approvals'),
  getProjectProgress: () => request.get('/dashboard/project-progress'),
  getMonthlyTrend: () => request.get('/dashboard/monthly-trend'),
};
