import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutOutlined, CheckCircleOutlined, BellOutlined, UserOutlined } from '@ant-design/icons';

const tabs = [
  { key: '/m/dashboard', icon: <LayoutOutlined />, label: '工作台' },
  { key: '/m/approvals', icon: <CheckCircleOutlined />, label: '审批' },
  { key: '/m/notifications', icon: <BellOutlined />, label: '消息' },
  { key: '/m/profile', icon: <UserOutlined />, label: '我的' },
];

const tabBarStyle: React.CSSProperties = {
  position: 'fixed', bottom: 0, left: 0, right: 0,
  height: 56, background: '#fff',
  display: 'flex', alignItems: 'center',
  borderTop: '1px solid #f0f0f0',
  zIndex: 1000, paddingBottom: 'env(safe-area-inset-bottom)',
};

const tabItemStyle = (active: boolean): React.CSSProperties => ({
  flex: 1, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  height: '100%', cursor: 'pointer',
  color: active ? '#2563eb' : '#8c8c8c',
  fontSize: 10, gap: 2,
});

const iconStyle: React.CSSProperties = { fontSize: 22 };

export default function MobileLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const current = location.pathname;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', paddingBottom: 64 }}>
      <Outlet />
      <div style={tabBarStyle}>
        {tabs.map((t) => (
          <div
            key={t.key}
            style={tabItemStyle(current.startsWith(t.key))}
            onClick={() => navigate(t.key)}
          >
            <span style={iconStyle}>{t.icon}</span>
            <span>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
