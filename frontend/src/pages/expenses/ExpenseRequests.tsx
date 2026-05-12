import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Card, Tabs, message, Modal, Descriptions, Timeline, Form, Select, InputNumber, Input } from 'antd';
import { PlusOutlined, SendOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { expenseRequestsApi } from '../../api/expenses';
import { useAuthStore } from '../../stores/authStore';
import request from '../../api/request';

const statusMap: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  pending_leader: { color: 'processing', label: '领导审批' },
  pending_finance: { color: 'warning', label: '财务审批' },
  approved: { color: 'success', label: '已通过' },
  rejected: { color: 'error', label: '已驳回' },
};

const payMethodMap: Record<string, string> = {
  bank_transfer: '银行转账',
  cash: '现金',
  check: '支票',
  other: '其他',
};

export default function ExpenseRequestsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [viewItem, setViewItem] = useState<any>(null);
  const [approvalHistory, setApprovalHistory] = useState<any[]>([]);
  const user = useAuthStore((s) => s.user);

  const fetch = async () => {
    setLoading(true);
    try {
      const res: any = await expenseRequestsApi.findAll();
      setData(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const filtered = activeTab === 'all' ? data : data.filter((p) => p.status === activeTab);

  const handleAction = async (action: string, id: number) => {
    try {
      const api = expenseRequestsApi as any;
      if (api[action]) await api[action](id);
      message.success('操作成功');
      fetch();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '操作失败');
    }
  };

  const columns = [
    { title: '编号', dataIndex: 'code', key: 'code', width: 200 },
    { title: '项目', key: 'project', dataIndex: ['project', 'name'], ellipsis: true },
    { title: '费用事由', dataIndex: 'reason', key: 'reason', ellipsis: true },
    { title: '金额', dataIndex: 'amount', key: 'amount', render: (v: any) => `¥${Number(v || 0).toLocaleString()}` },
    { title: '支付方式', dataIndex: 'payMethod', key: 'payMethod', render: (v: string) => payMethodMap[v] || v },
    { title: '创建人', dataIndex: ['createdBy', 'displayName'], key: 'creator', width: 100 },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 120, render: (v: string) => new Date(v).toLocaleDateString() },
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
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => {
            setViewItem(record);
            request.get('/approval-history', { params: { entityType: 'expense-request', entityId: record.id } })
              .then((res: any) => setApprovalHistory(res.data || []))
              .catch(() => setApprovalHistory([]));
          }}>查看</Button>
          {record.status === 'draft' && (
            <Button type="link" size="small" icon={<SendOutlined />} onClick={() => handleAction('submit', record.id)}>提交</Button>
          )}
          {record.status === 'pending_leader' && (user?.role === 'leader' || user?.role === 'admin') && (
            <>
              <Button type="link" size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }} onClick={() => handleAction('approveLeader', record.id)}>通过</Button>
              <Button type="link" size="small" icon={<CloseCircleOutlined />} danger onClick={() => handleAction('reject', record.id)}>驳回</Button>
            </>
          )}
          {record.status === 'pending_finance' && (user?.role === 'finance' || user?.role === 'admin') && (
            <>
              <Button type="link" size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }} onClick={() => handleAction('approveFinance', record.id)}>通过</Button>
              <Button type="link" size="small" icon={<CloseCircleOutlined />} danger onClick={() => handleAction('reject', record.id)}>驳回</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title="费用申请" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>新建申请</Button>}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}
          items={[
            { key: 'all', label: '全部' },
            { key: 'draft', label: '草稿' },
            { key: 'pending_leader', label: '领导审批' },
            { key: 'pending_finance', label: '财务审批' },
            { key: 'approved', label: '已通过' },
            { key: 'rejected', label: '已驳回' },
          ]}
        />
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>
      <ExpenseRequestForm open={formOpen} onClose={() => setFormOpen(false)} onSuccess={fetch} />
      <Modal title="费用申请详情" open={!!viewItem} onCancel={() => setViewItem(null)} footer={null} width={720}>
        {viewItem && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="编号" span={2}>{viewItem.code}</Descriptions.Item>
            <Descriptions.Item label="项目" span={2}>{viewItem.project?.name}</Descriptions.Item>
            <Descriptions.Item label="费用事由" span={2}>{viewItem.reason}</Descriptions.Item>
            <Descriptions.Item label="金额" span={2}>¥{Number(viewItem.amount || 0).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="支付方式">{payMethodMap[viewItem.payMethod] || viewItem.payMethod}</Descriptions.Item>
            <Descriptions.Item label="创建人">{viewItem.createdBy?.displayName}</Descriptions.Item>
            <Descriptions.Item label="创建时间" span={2}>{new Date(viewItem.createdAt).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="状态" span={2}>{statusMap[viewItem.status]?.label || viewItem.status}</Descriptions.Item>
            {viewItem.remark && <Descriptions.Item label="备注" span={2}>{viewItem.remark}</Descriptions.Item>}
          </Descriptions>
        )}
        {approvalHistory.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h4 style={{ marginBottom: 12 }}>审批记录</h4>
            <Timeline items={approvalHistory.map((h: any) => ({
              color: h.action === 'approve-leader' || h.action === 'approve-finance' || h.action === 'approve' ? 'green' : h.action === 'reject' ? 'red' : 'gray',
              children: (
                <div>
                  <div style={{ fontWeight: 500 }}>{h.action === 'approve-leader' || h.action === 'approve-finance' || h.action === 'approve' ? '通过' : h.action === 'reject' ? '驳回' : h.action}</div>
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

function ExpenseRequestForm({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      request.get('/projects').then((res: any) => setProjects(res.data || []));
      form.resetFields();
    }
  }, [open, form]);

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      await expenseRequestsApi.create(values);
      message.success('创建成功');
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="新建费用申请" open={open} onCancel={onClose} onOk={() => form.submit()} confirmLoading={loading} width={600} destroyOnClose>
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="projectId" label="项目" rules={[{ required: true, message: '请选择项目' }]}>
          <Select placeholder="选择项目" options={projects.map((p: any) => ({ value: p.id, label: `${p.name} (${p.code})` }))} />
        </Form.Item>
        <Form.Item name="reason" label="费用事由" rules={[{ required: true, message: '请输入费用事由' }]}>
          <Input.TextArea rows={3} placeholder="请输入费用事由" />
        </Form.Item>
        <Form.Item name="amount" label="金额" rules={[{ required: true, message: '请输入金额' }]}>
          <InputNumber min={0} prefix="¥" style={{ width: '100%' }} placeholder="请输入金额" />
        </Form.Item>
        <Form.Item name="payMethod" label="支付方式" rules={[{ required: true, message: '请选择支付方式' }]}>
          <Select placeholder="选择支付方式" options={[
            { value: 'bank_transfer', label: '银行转账' },
            { value: 'cash', label: '现金' },
            { value: 'check', label: '支票' },
            { value: 'other', label: '其他' },
          ]} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
