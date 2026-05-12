import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Card, message, Popconfirm } from 'antd';
import { EyeOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { stockOutApi } from '../../api/inventory';
import { useAuthStore } from '../../stores/authStore';

const statusMap: Record<string, { color: string; label: string }> = {
  pending_leader: { color: 'processing', label: '领导审批' },
  pending_purchaser: { color: 'warning', label: '采购审批' },
  approved: { color: 'success', label: '已通过' },
  rejected: { color: 'error', label: '已驳回' },
};

const reasonLabels: Record<string, string> = {
  design_change: '甲方设计变更',
  solution_optimization: '我方方案优化',
  procurement_error: '采购数量提报错误',
  other: '其他',
};

export default function StockOutRecordsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((s) => s.user);

  const fetch = async () => {
    setLoading(true);
    try {
      const res: any = await stockOutApi.findAll();
      setData(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleAction = async (action: string, id: number) => {
    try {
      const api = stockOutApi as any;
      if (api[action]) await api[action](id);
      message.success('操作成功');
      fetch();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '操作失败');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '项目', key: 'project', dataIndex: ['project', 'name'], ellipsis: true },
    { title: '原因', dataIndex: 'reasonType', render: (t: string) => reasonLabels[t] || t },
    { title: '明细项数', key: 'items', render: (_: any, r: any) => r.items?.length || 0 },
    { title: '创建人', dataIndex: ['createdBy', 'displayName'], width: 100 },
    { title: '创建时间', dataIndex: 'createdAt', width: 120, render: (v: string) => new Date(v).toLocaleDateString() },
    { title: '状态', dataIndex: 'status', width: 120, render: (s: string) => {
      const m = statusMap[s] || { color: 'default', label: s };
      return <Tag color={m.color}>{m.label}</Tag>;
    }},
    { title: '操作', key: 'action', width: 300, render: (_: any, r: any) => (
      <Space>
        {r.status === 'pending_leader' && (user?.role === 'leader' || user?.role === 'admin') && (
          <>
            <Button type="link" size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }} onClick={() => handleAction('approveLeader', r.id)}>通过</Button>
            <Popconfirm title="确认驳回？" onConfirm={() => handleAction('reject', r.id)}>
              <Button type="link" size="small" icon={<CloseCircleOutlined />} danger>驳回</Button>
            </Popconfirm>
          </>
        )}
        {r.status === 'pending_purchaser' && (user?.role === 'purchaser' || user?.role === 'admin') && (
          <>
            <Button type="link" size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }} onClick={() => handleAction('approvePurchaser', r.id)}>通过</Button>
            <Popconfirm title="确认驳回？" onConfirm={() => handleAction('reject', r.id)}>
              <Button type="link" size="small" icon={<CloseCircleOutlined />} danger>驳回</Button>
            </Popconfirm>
          </>
        )}
      </Space>
    )},
  ];

  return (
    <Card title="转库记录">
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
    </Card>
  );
}
