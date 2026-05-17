import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import {
  ClockCircleOutlined, ProjectOutlined, FundOutlined, DollarOutlined,
} from '@ant-design/icons';
import { dashboardApi } from '../../api/dashboard';

const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 10, padding: '14px 16px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

const kpiWrap: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 12px', marginBottom: 12,
};

const kpiNum: React.CSSProperties = { fontSize: 24, fontWeight: 700, lineHeight: 1.2 };
const kpiUnit: React.CSSProperties = { fontSize: 12, color: '#8c8c8c', marginLeft: 2 };
const kpiLabel: React.CSSProperties = { fontSize: 12, color: '#8c8c8c', marginBottom: 4 };
const kpiIconWrap: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 8,
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
};

const formatAmount = (v: number) => `¥${(v / 10000).toFixed(1)}万`;

export default function MobileDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.getStats(),
      dashboardApi.getPendingApprovals(),
    ]).then(([s, a]: any[]) => {
      setStats(s.data || s);
      setApprovals(a.data || a);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 80 }}><Spin /></div>;

  const kpis = [
    { label: '待审批', value: stats?.pendingApprovalCount, unit: '项', color: '#fa8c16', bg: '#fff7e6', icon: <ClockCircleOutlined /> },
    { label: '进行中项目', value: stats?.activeProjectCount, unit: '个', color: '#1890ff', bg: '#e6f7ff', icon: <ProjectOutlined /> },
    { label: '本月回款', value: formatAmount(stats?.monthlyReceivable || 0), unit: '', color: '#52c41a', bg: '#f6ffed', icon: <FundOutlined /> },
    { label: '本月支出', value: formatAmount(stats?.monthlyExpense || 0), unit: '', color: '#ff4d4f', bg: '#fff1f0', icon: <DollarOutlined /> },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a365d, #2563eb)',
        padding: '24px 16px 20px', color: '#fff',
      }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>扬光工程管理</div>
        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
          有 {stats?.pendingApprovalCount || 0} 项待审批事项
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ marginTop: -12, ...kpiWrap }}>
        {kpis.map((k, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={kpiLabel}>{k.label}</div>
                <div style={kpiNum}>{k.value}<span style={kpiUnit}>{k.unit}</span></div>
              </div>
              <div style={{ ...kpiIconWrap, background: k.bg, color: k.color }}>{k.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Approvals */}
      <div style={{ padding: '0 12px' }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, paddingLeft: 4 }}>待审批事项</div>
        {approvals.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '24px', color: '#8c8c8c', fontSize: 13 }}>
            暂无待审批事项
          </div>
        ) : (
          approvals.slice(0, 8).map((item: any, i: number) => (
            <div
              key={i}
              style={{
                ...cardStyle, marginBottom: 8, cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
              onClick={() => navigate('/m/approvals')}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{item.title}</div>
                {item.projectName && (
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>{item.projectName}</div>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#bfbfbf' }}>
                {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
