import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Card, message, Popconfirm, Modal, Descriptions, Timeline } from 'antd';
import { PlusOutlined, SendOutlined, CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, RollbackOutlined, EyeOutlined } from '@ant-design/icons';
import { purchaseConfirmsApi } from '../../api/purchases';
import { useAuthStore } from '../../stores/authStore';
import request from '../../api/request';
import PurchaseConfirmForm from './PurchaseConfirmForm';

const statusMap: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  pending_pm: { color: 'processing', label: '项目经理审批' },
  pending_leader: { color: 'warning', label: '领导审批' },
  approved: { color: 'success', label: '已通过' },
  rejected: { color: 'error', label: '已驳回' },
};

export default function PurchaseConfirmsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [approvalHistory, setApprovalHistory] = useState<any[]>([]);
  const user = useAuthStore((s) => s.user);

  const fetch = async () => {
    setLoading(true);
    try {
      const res: any = await purchaseConfirmsApi.findAll();
      setData(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleAction = async (action: string, id: number) => {
    try {
      const api = purchaseConfirmsApi as any;
      if (api[action]) await api[action](id);
      message.success('操作成功');
      fetch();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '操作失败');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '编号', dataIndex: 'code', key: 'code', width: 200 },
    { title: '询价单', key: 'inquiry', render: (_: any, r: any) => `#${r.inquiryOrder?.id || '-'}` },
    { title: '总金额', dataIndex: 'totalAmount', render: (v: any) => `¥${Number(v || 0).toLocaleString()}` },
    { title: '创建人', dataIndex: ['createdBy', 'displayName'], width: 100 },
    { title: '创建时间', dataIndex: 'createdAt', width: 120, render: (v: string) => new Date(v).toLocaleDateString() },
    { title: '状态', dataIndex: 'status', width: 120, render: (s: string) => {
      const m = statusMap[s] || { color: 'default', label: s };
      return <Tag color={m.color}>{m.label}</Tag>;
    }},
    { title: '操作', key: 'action', width: 320, render: (_: any, r: any) => (
      <Space>
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={async () => {
          try { const res: any = await purchaseConfirmsApi.findOne(r.id); setViewItem(res.data || r); } catch { setViewItem(r); }
          request.get('/approval-history', { params: { entityType: 'purchase-confirm', entityId: r.id } }).then((res: any) => setApprovalHistory(res.data || [])).catch(() => setApprovalHistory([]));
        }}>查看</Button>
        {r.status === 'draft' && <Button type="link" size="small" icon={<SendOutlined />} onClick={() => handleAction('submit', r.id)}>提交</Button>}
        {(r.status === 'pending_pm' || r.status === 'pending_leader') && (r.createdById === user?.id || user?.role === 'admin') && (
          <Popconfirm title="确认撤回？" onConfirm={() => handleAction('withdraw', r.id)}>
            <Button type="link" size="small" icon={<RollbackOutlined />}>撤回</Button>
          </Popconfirm>
        )}
        {r.status === 'pending_pm' && (user?.role === 'pm' || user?.role === 'admin') && <>
          <Button type="link" size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }} onClick={() => handleAction('approvePm', r.id)}>通过</Button>
          <Button type="link" size="small" icon={<CloseCircleOutlined />} danger onClick={() => handleAction('reject', r.id)}>驳回</Button>
        </>}
        {r.status === 'pending_leader' && (user?.role === 'leader' || user?.role === 'admin') && <>
          <Button type="link" size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }} onClick={() => handleAction('approveLeader', r.id)}>通过</Button>
          <Button type="link" size="small" icon={<CloseCircleOutlined />} danger onClick={() => handleAction('reject', r.id)}>驳回</Button>
        </>}
        {user?.role === 'admin' && (
          <Popconfirm title="确认删除？" onConfirm={() => handleAction('delete', r.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        )}
      </Space>
    )},
  ];

  return (
    <div>
      <Card title="采购确认" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>新建确认单</Button>}>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>
      <PurchaseConfirmForm open={formOpen} onClose={() => setFormOpen(false)} onSuccess={fetch} />
      <Modal title="采购确认单详情" open={!!viewItem} onCancel={() => setViewItem(null)} footer={null} width={720}>
        {viewItem && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="编号" span={2}>{viewItem.code}</Descriptions.Item>
            <Descriptions.Item label="关联询价单" span={2}>
              {viewItem.inquiryOrder?.code || `#${viewItem.inquiryOrder?.id}`}
              {viewItem.inquiryOrder?.purchaseRequest?.project?.name ? ` → ${viewItem.inquiryOrder.purchaseRequest.project.name}` : ''}
            </Descriptions.Item>
            <Descriptions.Item label="总金额" span={2}>¥{Number(viewItem.totalAmount || 0).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="创建人">{viewItem.createdBy?.displayName}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(viewItem.createdAt).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="状态" span={2}>{statusMap[viewItem.status]?.label || viewItem.status}</Descriptions.Item>
            {viewItem.deliveryPaymentTerms && <Descriptions.Item label="付款条件" span={2}>{viewItem.deliveryPaymentTerms}</Descriptions.Item>}
            {viewItem.supplyCycle && <Descriptions.Item label="供货周期">{viewItem.supplyCycle}</Descriptions.Item>}
            {viewItem.items && viewItem.items.length > 0 && (
              <Descriptions.Item label="明细" span={2}>
                {viewItem.items.map((item: any, i: number) => (
                  <div key={i} style={{ padding: '2px 0' }}>{item.name} / {item.brand} / {item.spec} × {item.quantity}{item.unit} — ¥{Number(item.purchasePrice).toLocaleString()}</div>
                ))}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
        {approvalHistory.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h4 style={{ marginBottom: 12 }}>审批记录</h4>
            <Timeline items={approvalHistory.map((h: any) => ({
              color: h.action === 'approve' ? 'green' : h.action === 'reject' ? 'red' : 'gray',
              children: (
                <div>
                  <div style={{ fontWeight: 500 }}>{h.action === 'approve' ? '通过' : h.action === 'reject' ? '驳回' : h.action}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>{h.approver?.displayName} · {new Date(h.createdAt).toLocaleString()}</div>
                  {h.comment && <div style={{ fontSize: 13, color: '#999' }}>备注：{h.comment}</div>}
                </div>
              ),
            }))} />
          </div>
        )}
      </Modal>
    </div>
  );
}
