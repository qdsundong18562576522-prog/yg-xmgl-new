import { useState, useEffect } from 'react';
import { Tag, message, Modal } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { dashboardApi } from '../../api/dashboard';
import { paymentRequestsApi } from '../../api/finance';
import { expenseRequestsApi, reimbursementsApi } from '../../api/expenses';

const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 10, padding: '14px 16px', marginBottom: 8,
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

const statusColors: Record<string, string> = {
  pending: '#faad14', pending_pm: '#faad14', pending_leader: '#faad14',
  pending_purchaser: '#faad14', pending_finance: '#faad14',
};

const statusLabels: Record<string, string> = {
  pending: '待审批', pending_pm: '待PM审批', pending_leader: '待领导审批',
  pending_purchaser: '待采购审批', pending_finance: '待财务审批',
};

const entityTypeToApi: Record<string, { approve: string; reject: string }> = {
  'payment-request': { approve: 'approveLeader', reject: 'reject' },
  'expense-request': { approve: 'approveLeader', reject: 'reject' },
  reimbursement: { approve: 'approvePm', reject: 'reject' },
};

export default function MobileApprovals() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    setLoading(true);
    dashboardApi.getPendingApprovals()
      .then((res: any) => setApprovals(res.data || res))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const handleAction = async (item: any, action: 'approve' | 'reject') => {
    const apiMap: Record<string, any> = {
      'payment-request': paymentRequestsApi,
      'expense-request': expenseRequestsApi,
      reimbursement: reimbursementsApi,
    };
    const api = apiMap[item.entityType];
    if (!api) { message.warning('暂不支持该类型审批操作'); return; }

    const methodName = action === 'approve'
      ? entityTypeToApi[item.entityType]?.approve
      : entityTypeToApi[item.entityType]?.reject;
    if (!methodName) { message.warning('暂不支持该操作'); return; }

    Modal.confirm({
      title: action === 'approve' ? '确认通过' : '确认驳回',
      content: `${action === 'approve' ? '通过' : '驳回'} ${item.title}（${item.code}）？`,
      onOk: async () => {
        try {
          await api[methodName](item.id);
          message.success(action === 'approve' ? '已通过' : '已驳回');
          fetch();
        } catch (e: any) {
          message.error(e?.response?.data?.message || '操作失败');
        }
      },
    });
  };

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, #1a365d, #2563eb)',
        padding: '20px 16px', color: '#fff',
      }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>审批</div>
        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>
          共 {approvals.length} 项待审批
        </div>
      </div>

      <div style={{ padding: '12px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c', fontSize: 13 }}>加载中...</div>
        ) : approvals.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 60, color: '#8c8c8c', fontSize: 14,
          }}>
            <CheckCircleOutlined style={{ fontSize: 40, color: '#52c41a', marginBottom: 12 }} />
            <div>暂无待审批事项</div>
          </div>
        ) : (
          approvals.map((item: any, i: number) => (
            <div key={i} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: '#595959', marginTop: 2 }}>{item.code}</div>
                  {item.projectName && (
                    <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>{item.projectName}</div>
                  )}
                </div>
                <Tag color={statusColors[item.status] || 'default'}>
                  {statusLabels[item.status] || item.status}
                </Tag>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <div
                  style={{
                    flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 6,
                    border: '1px solid #52c41a', color: '#52c41a', fontSize: 13, fontWeight: 500,
                    cursor: 'pointer',
                  }}
                  onClick={() => handleAction(item, 'approve')}
                >
                  <CheckCircleOutlined /> 通过
                </div>
                <div
                  style={{
                    flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 6,
                    border: '1px solid #ff4d4f', color: '#ff4d4f', fontSize: 13, fontWeight: 500,
                    cursor: 'pointer',
                  }}
                  onClick={() => handleAction(item, 'reject')}
                >
                  <CloseCircleOutlined /> 驳回
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
