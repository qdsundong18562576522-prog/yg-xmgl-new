import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Card, Tabs, message, Modal, Descriptions, Timeline, Form, Select, InputNumber, Input } from 'antd';
import { PlusOutlined, SendOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { laborContractsApi } from '../../api/expenses';
import { useAuthStore } from '../../stores/authStore';
import request from '../../api/request';

const statusMap: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  pending_pm: { color: 'processing', label: '项目经理审批' },
  pending_leader: { color: 'warning', label: '领导审批' },
  approved: { color: 'success', label: '已通过' },
  rejected: { color: 'error', label: '已驳回' },
};

export default function LaborContractsPage() {
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
      const res: any = await laborContractsApi.findAll();
      setData(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const filtered = activeTab === 'all' ? data : data.filter((p) => p.status === activeTab);

  const handleAction = async (action: string, id: number) => {
    try {
      const api = laborContractsApi as any;
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
    { title: '合同金额', dataIndex: 'amount', key: 'amount', render: (v: any) => `¥${Number(v || 0).toLocaleString()}` },
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
            request.get('/approval-history', { params: { entityType: 'labor-contract', entityId: record.id } })
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
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title="劳务合同" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>新建劳务合同</Button>}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}
          items={[
            { key: 'all', label: '全部' },
            { key: 'draft', label: '草稿' },
            { key: 'pending_pm', label: '项目经理审批' },
            { key: 'pending_leader', label: '领导审批' },
            { key: 'approved', label: '已通过' },
            { key: 'rejected', label: '已驳回' },
          ]}
        />
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>
      <LaborContractForm open={formOpen} onClose={() => setFormOpen(false)} onSuccess={fetch} />
      <Modal title="劳务合同详情" open={!!viewItem} onCancel={() => setViewItem(null)} footer={null} width={720}>
        {viewItem && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="编号" span={2}>{viewItem.code}</Descriptions.Item>
            <Descriptions.Item label="项目" span={2}>{viewItem.project?.name}</Descriptions.Item>
            <Descriptions.Item label="合同金额" span={2}>¥{Number(viewItem.amount || 0).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="创建人">{viewItem.createdBy?.displayName}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(viewItem.createdAt).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="状态" span={2}>{statusMap[viewItem.status]?.label || viewItem.status}</Descriptions.Item>
            {viewItem.contractFile && <Descriptions.Item label="合同文件" span={2}>{viewItem.contractFile}</Descriptions.Item>}
            {viewItem.remark && <Descriptions.Item label="备注" span={2}>{viewItem.remark}</Descriptions.Item>}
          </Descriptions>
        )}
        {approvalHistory.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h4 style={{ marginBottom: 12 }}>审批记录</h4>
            <Timeline items={approvalHistory.map((h: any) => ({
              color: h.action === 'approve-pm' || h.action === 'approve-leader' ? 'green' : h.action === 'reject' ? 'red' : 'gray',
              children: (
                <div>
                  <div style={{ fontWeight: 500 }}>{h.action === 'approve-pm' || h.action === 'approve-leader' ? '通过' : h.action === 'reject' ? '驳回' : h.action}</div>
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

function LaborContractForm({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
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
      await laborContractsApi.create(values);
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
    <Modal title="新建劳务合同" open={open} onCancel={onClose} onOk={() => form.submit()} confirmLoading={loading} width={600} destroyOnClose>
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="projectId" label="项目" rules={[{ required: true, message: '请选择项目' }]}>
          <Select placeholder="选择项目" options={projects.map((p: any) => ({ value: p.id, label: `${p.name} (${p.code})` }))} />
        </Form.Item>
        <Form.Item name="amount" label="合同金额" rules={[{ required: true, message: '请输入合同金额' }]}>
          <InputNumber min={0} prefix="¥" style={{ width: '100%' }} placeholder="请输入合同金额" />
        </Form.Item>
        <Form.Item name="contractFile" label="合同文件">
          <Input placeholder="输入合同文件路径或URL" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
