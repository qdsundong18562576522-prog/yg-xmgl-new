import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Card, message, Popconfirm, Modal, Descriptions, Timeline } from 'antd';
import { PlusOutlined, EditOutlined, SendOutlined, CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, RollbackOutlined, EyeOutlined } from '@ant-design/icons';
import { purchaseRequestsApi } from '../../api/purchases';
import { useAuthStore } from '../../stores/authStore';
import request from '../../api/request';
import PurchaseRequestForm from './PurchaseRequestForm';

const statusMap: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  pending: { color: 'processing', label: '审批中' },
  approved: { color: 'success', label: '已通过' },
  rejected: { color: 'error', label: '已驳回' },
};

export default function PurchaseRequestsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [approvalHistory, setApprovalHistory] = useState<any[]>([]);
  const user = useAuthStore((s) => s.user);

  const fetch = async () => {
    setLoading(true);
    try {
      const res: any = await purchaseRequestsApi.findAll();
      setData(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (id: number) => {
    try { await purchaseRequestsApi.submit(id); message.success('已提交'); fetch(); }
    catch (err: any) { message.error(err?.response?.data?.message || '失败'); }
  };

  const handleApprove = async (id: number) => {
    try { await purchaseRequestsApi.approve(id); message.success('已通过'); fetch(); }
    catch (err: any) { message.error(err?.response?.data?.message || '失败'); }
  };

  const handleReject = async (id: number) => {
    try { await purchaseRequestsApi.reject(id); message.success('已驳回'); fetch(); }
    catch (err: any) { message.error(err?.response?.data?.message || '失败'); }
  };

  const handleWithdraw = async (id: number) => {
    try { await purchaseRequestsApi.withdraw(id); message.success('已撤回'); fetch(); }
    catch (err: any) { message.error(err?.response?.data?.message || '撤回失败'); }
  };

  const handleConfirm = async (id: number) => {
    try { await purchaseRequestsApi.confirm(id); message.success('已确认收到'); fetch(); }
    catch (err: any) { message.error(err?.response?.data?.message || '失败'); }
  };

  const handleDelete = async (id: number) => {
    try { await purchaseRequestsApi.delete(id); message.success('已删除'); fetch(); }
    catch (err: any) { message.error(err?.response?.data?.message || '删除失败'); }
  };

  const columns = [
    { title: '项目', key: 'project', dataIndex: ['project', 'name'], ellipsis: true },
    { title: '编号', dataIndex: 'code', key: 'code', width: 200 },
    { title: '总金额', dataIndex: 'totalAmount', key: 'amount', render: (v: any) => `¥${Number(v || 0).toLocaleString()}` },
    { title: '创建人', dataIndex: ['createdBy', 'displayName'], key: 'creator', width: 100 },
    { title: '创建时间', dataIndex: 'createdAt', key: 'date', width: 120, render: (v: string) => new Date(v).toLocaleDateString() },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 120,
      render: (s: string) => {
        const m = statusMap[s] || { color: 'default', label: s };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: '操作', key: 'action', width: 320,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => { setViewItem(record); request.get('/approval-history', { params: { entityType: 'purchase-request', entityId: record.id } }).then((res: any) => setApprovalHistory(res.data || [])).catch(() => setApprovalHistory([])); }}>查看</Button>
          {record.status === 'draft' && (
            <>
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditItem(record); setFormOpen(true); }}>编辑</Button>
              <Button type="link" size="small" icon={<SendOutlined />} onClick={() => handleSubmit(record.id)}>提交</Button>
            </>
          )}
          {record.status === 'pending' && (record.createdById === user?.id || user?.role === 'admin') && (
            <Popconfirm title="确认撤回？" onConfirm={() => handleWithdraw(record.id)}>
              <Button type="link" size="small" icon={<RollbackOutlined />}>撤回</Button>
            </Popconfirm>
          )}
          {(record.status === 'pending' && (user?.role === 'leader' || user?.role === 'admin')) && (
            <>
              <Button type="link" size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }} onClick={() => handleApprove(record.id)}>通过</Button>
              <Button type="link" size="small" icon={<CloseCircleOutlined />} danger onClick={() => handleReject(record.id)}>驳回</Button>
            </>
          )}
          {user?.role === 'admin' && (
            <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title="采购申请" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditItem(null); setFormOpen(true); }}>新建采购申请</Button>}>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>
      <PurchaseRequestForm open={formOpen} onClose={() => { setFormOpen(false); setEditItem(null); }} onSuccess={fetch} editData={editItem} />
      <Modal title="采购申请详情" open={!!viewItem} onCancel={() => setViewItem(null)} footer={null} width={720}>
        {viewItem && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="编号" span={2}>{viewItem.code}</Descriptions.Item>
            <Descriptions.Item label="项目" span={2}>{viewItem.project?.name}</Descriptions.Item>
            <Descriptions.Item label="总金额" span={2}>¥{Number(viewItem.totalAmount || 0).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="创建人">{viewItem.createdBy?.displayName}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(viewItem.createdAt).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="状态" span={2}>{statusMap[viewItem.status]?.label || viewItem.status}</Descriptions.Item>
            {viewItem.deliveryAddress && <Descriptions.Item label="到货地址" span={2}>{viewItem.deliveryAddress}</Descriptions.Item>}
            {viewItem.receiver && <Descriptions.Item label="收货人">{viewItem.receiver}</Descriptions.Item>}
            {viewItem.phone && <Descriptions.Item label="电话">{viewItem.phone}</Descriptions.Item>}
            {viewItem.requiredDeliveryDate && <Descriptions.Item label="要求到货时间">{new Date(viewItem.requiredDeliveryDate).toLocaleDateString()}</Descriptions.Item>}
            {viewItem.remark && <Descriptions.Item label="备注" span={2}>{viewItem.remark}</Descriptions.Item>}
            {viewItem.items && viewItem.items.length > 0 && (
              <Descriptions.Item label="采购明细" span={2}>
                {viewItem.items.map((item: any, i: number) => (
                  <div key={i} style={{ padding: '2px 0' }}>{item.name} / {item.brand} / {item.spec} × {item.quantity}{item.unit} — ¥{Number(item.contractPrice).toLocaleString()}</div>
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
