import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, message } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { notificationsApi } from '../../api/notifications';

const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 10, padding: '14px 16px', marginBottom: 8,
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer',
};

const entityRoutes: Record<string, string> = {
  'payment-request': '/finance/payment-requests',
  'expense-request': '/expenses/requests',
  reimbursement: '/expenses/reimbursements',
  'labor-contract': '/labor/contracts',
  'labor-visa': '/labor/visas',
  project: '/projects',
  'purchase-request': '/purchases/requests',
};

export default function MobileNotifications() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    notificationsApi.findAll()
      .then((res: any) => setData(res.data || res))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const markRead = async (id: number) => {
    try {
      await notificationsApi.markRead(id);
      fetch();
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      message.success('全部已读');
      fetch();
    } catch {}
  };

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, #1a365d, #2563eb)',
        padding: '20px 16px', color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>消息通知</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>
            共 {data.length} 条消息
          </div>
        </div>
        <Button size="small" ghost icon={<CheckOutlined />} onClick={markAllRead}>
          全部已读
        </Button>
      </div>

      <div style={{ padding: '12px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>加载中...</div>
        ) : data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#8c8c8c' }}>
            <BellOutlined style={{ fontSize: 40, color: '#d9d9d9', marginBottom: 12 }} />
            <div>暂无通知</div>
          </div>
        ) : (
          data.map((item: any) => (
            <div
              key={item.id}
              style={{
                ...cardStyle,
                borderLeft: item.isRead ? '3px solid transparent' : '3px solid #2563eb',
                background: item.isRead ? '#fff' : '#f0f5ff',
              }}
              onClick={() => {
                if (!item.isRead) markRead(item.id);
                if (item.entityType && entityRoutes[item.entityType]) {
                  navigate(entityRoutes[item.entityType]);
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 14, fontWeight: item.isRead ? 400 : 600 }}>
                  {item.title}
                </div>
                {!item.isRead && (
                  <span style={{
                    width: 8, height: 8, borderRadius: 4, background: '#2563eb',
                    flexShrink: 0, marginTop: 6,
                  }} />
                )}
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{item.content}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
