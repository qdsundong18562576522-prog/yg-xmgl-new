import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Card, Tabs, message, Modal, Descriptions, Timeline, Form, Select, InputNumber, Input, Checkbox } from 'antd';
import { PlusOutlined, SendOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { reimbursementsApi } from '../../api/expenses';
import { useAuthStore } from '../../stores/authStore';
import request from '../../api/request';

const statusMap: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  pending_pm: { color: 'processing', label: '项目经理审批' },
  pending_leader: { color: 'warning', label: '领导审批' },
  pending_finance: { color: 'orange', label: '财务审批' },
  approved: { color: 'success', label: '已通过' },
  rejected: { color: 'error', label: '已驳回' },
};

export default function ReimbursementsPage() {
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
      const res: any = await reimbursementsApi.findAll();
      setData(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const filtered = activeTab === 'all' ? data : data.filter((p) => p.status === activeTab);

  const handleAction = async (action: string, id: number) => {
    try {
      const api = reimbursementsApi as any;
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
    { title: '报销事由', dataIndex: 'reason', key: 'reason', ellipsis: true },
    { title: '金额', dataIndex: 'amount', key: 'amount', render: (v: any) => `¥${Number(v || 0).toLocaleString()}` },
    { title: '是否有发票', dataIndex: 'hasInvoice', key: 'hasInvoice', width: 100, render: (v: boolean) => v ? '是' : '否' },
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
            request.get('/approval-history', { params: { entityType: 'reimbursement', entityId: record.id } })
              .then((res: any) => setApprovalHistory(res.data || []))
              .catch(() => setApprovalHistory([]));
          }}>查看</Button>
          {record.status === 'draft' && (
            <Button type="link" size="small" icon={<SendOutlined />} onClick={() => handleAction('submit', record.id)}>提交</Button>
          )}
          {record.status === 'pending_pm' && (user?.role === 'pm' || user?.role === 'admin') && (
            <>
              <Button type="link" size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }} onClick={() => handleAction('approvePm', record.id)}>通过</Button>
              <Button type="link" size="small" icon={<CloseCircleOutlined />} danger onClick={() => handleAction('reject', record.id)}>驳回</Button>
            </>
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
      <Card title="报销单" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>新建报销单</Button>}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}
          items={[
            { key: 'all', label: '全部' },
            { key: 'draft', label: '草稿' },
            { key: 'pending_pm', label: '项目经理审批' },
            { key: 'pending_leader', label: '领导审批' },
            { key: 'pending_finance', label: '财务审批' },
            { key: 'approved', label: '已通过' },
            { key: 'rejected', label: '已驳回' },
          ]}
        />
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>
      <ReimbursementForm open={formOpen} onClose={() => setFormOpen(false)} onSuccess={fetch} />
      <Modal title="报销单详情" open={!!viewItem} onCancel={() => setViewItem(null)} footer={null} width={720}>
        {viewItem && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="编号" span={2}>{viewItem.code}</Descriptions.Item>
            <Descriptions.Item label="项目" span={2}>{viewItem.project?.name}</Descriptions.Item>
            <Descriptions.Item label="报销事由" span={2}>{viewItem.reason}</Descriptions.Item>
            <Descriptions.Item label="金额" span={2}>¥{Number(viewItem.amount || 0).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="是否有发票">{viewItem.hasInvoice ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label="创建人">{viewItem.createdBy?.displayName}</Descriptions.Item>
            <Descriptions.Item label="创建时间" span={2}>{new Date(viewItem.createdAt).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="状态" span={2}>{statusMap[viewItem.status]?.label || viewItem.status}</Descriptions.Item>
            {viewItem.invoiceFile && <Descriptions.Item label="发票文件" span={2}>{viewItem.invoiceFile}</Descriptions.Item>}
            {viewItem.noInvoiceReason && <Descriptions.Item label="无发票原因" span={2}>{viewItem.noInvoiceReason}</Descriptions.Item>}
            {viewItem.remark && <Descriptions.Item label="备注" span={2}>{viewItem.remark}</Descriptions.Item>}
          </Descriptions>
        )}
        {approvalHistory.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h4 style={{ marginBottom: 12 }}>审批记录</h4>
            <Timeline items={approvalHistory.map((h: any) => ({
              color: h.action === 'approve-pm' || h.action === 'approve-leader' || h.action === 'approve-finance' ? 'green' : h.action === 'reject' ? 'red' : 'gray',
              children: (
                <div>
                  <div style={{ fontWeight: 500 }}>{h.action === 'approve-pm' || h.action === 'approve-leader' || h.action === 'approve-finance' ? '通过' : h.action === 'reject' ? '驳回' : h.action}</div>
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


function ReimbursementForm({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [hasInvoice, setHasInvoice] = useState<string>();

  useEffect(() => {
    if (open) {
      request.get('/projects').then((res: any) => setProjects(res.data || []));
      form.resetFields();
      setHasInvoice(undefined);
    }
  }, [open, form]);

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      await reimbursementsApi.create(values);
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
    <Modal title="新建报销单" open={open} onCancel={onClose} onOk={() => form.submit()} confirmLoading={loading} width={600} destroyOnClose>
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="projectId" label="项目" rules={[{ required: true, message: '请选择项目' }]}>
          <Select placeholder="选择项目" options={projects.map((p: any) => ({ value: p.id, label: p.name + ' (' + p.code + ')' }))} />
        </Form.Item>
        <Form.Item name="reason" label="报销事由" rules={[{ required: true, message: '请输入报销事由' }]}>
          <Input.TextArea rows={3} placeholder="请输入报销事由" />
        </Form.Item>
        <Form.Item name="amount" label="金额" rules={[{ required: true, message: '请输入金额' }]}>
          <InputNumber min={0} prefix="¥" style={{ width: '100%' }} placeholder="请输入金额" />
        </Form.Item>
        <Form.Item name="hasInvoice" label="发票情况">
          <Select placeholder="请选择发票情况" onChange={(val) => setHasInvoice(val as string)}>
            <Select.Option value="yes">有发票</Select.Option>
            <Select.Option value="no">无发票</Select.Option>
          </Select>
        </Form.Item>
        {hasInvoice === "yes" && (
          <Form.Item label="发票文件">
            <input type="file" multiple accept=".pdf,.jpg,.png" onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              if (files.length === 0) return;
              const urls: string[] = [];
              for (const file of files) {
                const fd = new FormData();
                fd.append('file', file);
                try {
                  const res: any = await request.post('/upload', fd);
                  const url = res.data?.url || res.url || '';
                  if (url) urls.push(url);
                } catch {}
              }
              if (urls.length > 0) {
                form.setFieldsValue({ invoiceFile: urls.join(';') });
                message.success('已上传 ' + urls.length + ' 个文件');
              }
              e.target.value = '';
            }} style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 12, color: '#999' }}>支持 .pdf .jpg .png，可多选，文件名会以分号分隔保存</div>
          </Form.Item>
        )}
        {hasInvoice === "no" && (
          <Form.Item name="noInvoiceReason" label="无发票原因">
            <Input.TextArea rows={2} placeholder="请输入无发票原因" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}

