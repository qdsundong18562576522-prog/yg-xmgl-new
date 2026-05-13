import { useState, useEffect, useRef } from 'react';
import { Badge, Popover, List, Button, message } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../api/notifications';

const iconMap: Record<string, string> = {
  approval_required: '📋',
  approved: '✅',
  rejected: '❌',
  withdrawn: '↩️',
};

const entityRoutes: Record<string, string> = {
  project: '/projects',
  'purchase-request': '/purchases/requests',
  'inquiry-order': '/purchases/inquiries',
  'purchase-confirm': '/purchases/confirms',
  'delivery-notice': '/purchases/delivery',
  'stock-out': '/inventory/stock-out',
  'material-requisition': '/inventory/requisitions',
  'expense-request': '/expenses/requests',
  reimbursement: '/expenses/reimbursements',
  'contract-variation': '/projects/variations',
  'labor-contract': '/labor/contracts',
  'labor-visa': '/labor/visas',
  'payment-request': '/finance/payment-requests',
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [listRes, countRes]: any = await Promise.all([
        notificationsApi.findAll(),
        notificationsApi.unreadCount(),
      ]);
      setNotifications(listRes.data || []);
      setUnreadCount(countRes.data?.count || 0);
    } catch {}
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleClick = async (item: any) => {
    try {
      await notificationsApi.markRead(item.id);
      setOpen(false);
      if (item.entityType && entityRoutes[item.entityType]) {
        navigate(entityRoutes[item.entityType]);
      }
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setUnreadCount(0);
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      message.success('已全部标记已读');
    } catch {}
  };

  const content = (
    <div style={{ width: 360 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong>消息通知</strong>
        <Button type="link" size="small" onClick={handleMarkAllRead}>全部已读</Button>
      </div>
      <List
        dataSource={notifications.slice(0, 10)}
        locale={{ emptyText: '暂无通知' }}
        renderItem={(item: any) => (
          <List.Item
            onClick={() => handleClick(item)}
            style={{
              cursor: 'pointer',
              padding: '8px 12px',
              background: item.isRead ? 'transparent' : '#e6f7ff',
              borderRadius: 4,
              marginBottom: 2,
            }}
          >
            <List.Item.Meta
              avatar={<span style={{ fontSize: 18 }}>{iconMap[item.type] || '📌'}</span>}
              title={<span style={{ fontWeight: item.isRead ? 400 : 600, fontSize: 13 }}>{item.title}</span>}
              description={
                <div>
                  <div style={{ fontSize: 12, color: '#666' }}>{item.content}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );

  return (
    <Popover content={content} trigger="click" open={open} onOpenChange={setOpen} placement="bottomRight">
      <Badge count={unreadCount} size="small" style={{ cursor: 'pointer' }}>
        <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
      </Badge>
    </Popover>
  );
}
