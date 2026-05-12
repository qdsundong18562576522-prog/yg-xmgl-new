import { useState, useEffect, useMemo } from 'react';
import { Table, Button, Tag, Space, Card, Tabs, message, Modal, Descriptions, Timeline, Form, Select, Input, InputNumber } from 'antd';
import { PlusOutlined, SendOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { contractVariationsApi } from '../../api/expenses';
import { useAuthStore } from '../../stores/authStore';
import request from '../../api/request';

const statusMap: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  pending: { color: 'processing', label: '审批中' },
  approved: { color: 'success', label: '已通过' },
  rejected: { color: 'error', label: '已驳回' },
};

export default function ContractVariationsPage() {
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
      const res: any = await contractVariationsApi.findAll();
      setData(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const filtered = activeTab === 'all' ? data : data.filter((p) => p.status === activeTab);

  const handleAction = async (action: string, id: number, comment?: string) => {
    try {
      const api = contractVariationsApi as any;
      if (api[action]) await api[action](id, comment);
      message.success('操作成功');
      fetch();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '操作失败');
    }
  };

  const columns = [
    { title: '编号', dataIndex: 'code', key: 'code', width: 200 },
    { title: '项目', key: 'project', dataIndex: ['project', 'name'], ellipsis: true },
    { title: '明细项数', key: 'items', render: (items: any[]) => items?.length || 0 },
    { title: '创建人', dataIndex: ['createdBy', 'displayName'], key: 'creator', width: 100 },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 120, render: (v: string) => new Date(v).toLocaleDateString() },
    { title: '状态', dataIndex: 'status', width: 120, render: (s: string) => {
      const m = statusMap[s] || { color: 'default', label: s };
      return <Tag color={m.color}>{m.label}</Tag>;
    }},
    { title: '操作', key: 'action', width: 320, render: (_: any, record: any) => (
      <Space>
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => {
          setViewItem(record);
          request.get('/approval-history', { params: { entityType: 'contract-variation', entityId: record.id } })
            .then((res: any) => setApprovalHistory(res.data || [])).catch(() => setApprovalHistory([]));
        }}>查看</Button>
        {record.status === 'draft' && (
          <Button type="link" size="small" icon={<SendOutlined />} onClick={() => handleAction('submit', record.id)}>提交</Button>
        )}
        {record.status === 'pending' && (user?.role === 'leader' || user?.role === 'admin') && (
          <>
            <Button type="link" size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }} onClick={() => handleAction('approve', record.id)}>通过</Button>
            <Button type="link" size="small" icon={<CloseCircleOutlined />} danger onClick={() => handleAction('reject', record.id)}>驳回</Button>
          </>
        )}
      </Space>
    )},
  ];

  return (
    <div>
      <Card title="工程量变更" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>新建变更</Button>}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}
          items={[
            { key: 'all', label: '全部' }, { key: 'draft', label: '草稿' },
            { key: 'pending', label: '审批中' }, { key: 'approved', label: '已通过' }, { key: 'rejected', label: '已驳回' },
          ]}
        />
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>
      <ContractVariationForm open={formOpen} onClose={() => setFormOpen(false)} onSuccess={fetch} />
      <Modal title="工程量变更详情" open={!!viewItem} onCancel={() => setViewItem(null)} footer={null} width={720}>
        {viewItem && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="编号" span={2}>{viewItem.code}</Descriptions.Item>
            <Descriptions.Item label="项目" span={2}>{viewItem.project?.name}</Descriptions.Item>
            <Descriptions.Item label="创建人">{viewItem.createdBy?.displayName}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(viewItem.createdAt).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="状态" span={2}>{statusMap[viewItem.status]?.label || viewItem.status}</Descriptions.Item>
            {viewItem.items && viewItem.items.length > 0 && (
              <Descriptions.Item label="变更明细" span={2}>
                {viewItem.items.map((item: any, i: number) => {
                  const total = Number(item.quantity) * Number(item.contractPrice);
                  return <div key={i} style={{ padding: '2px 0' }}>{item.name} / {item.spec} / {item.unit} × {item.quantity} — 综合单价 ¥{Number(item.contractPrice).toLocaleString()} = ¥{total.toLocaleString()}</div>;
                })}
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

function ContractVariationForm({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([{ name: '', spec: '', unit: '', quantity: 0, contractPrice: 0 }]);

  useEffect(() => {
    if (open) {
      request.get('/projects').then((res: any) => setProjects(res.data || []));
      form.resetFields();
      setItems([{ name: '', spec: '', unit: '', quantity: 0, contractPrice: 0 }]);
    }
  }, [open, form]);

  const updateItem = (idx: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { name: '', spec: '', unit: '', quantity: 0, contractPrice: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const totalAmount = useMemo(() =>
    items.reduce((sum, item) => sum + (item.quantity || 0) * (item.contractPrice || 0), 0),
    [items]
  );

  const handleSubmit = async () => {
    const projectId = form.getFieldValue('projectId');
    if (!projectId) { message.error('请选择项目'); return; }
    const validItems = items.filter((item) => item.name);
    if (validItems.length === 0) { message.error('请至少添加一条有效明细'); return; }

    setLoading(true);
    try {
      await contractVariationsApi.create({ projectId, items: validItems });
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
    <Modal title="新建工程量变更" open={open} onCancel={onClose} onOk={handleSubmit} confirmLoading={loading} width={850} destroyOnClose>
      <Form form={form} layout="vertical">
        <Form.Item name="projectId" label="关联项目" rules={[{ required: true, message: '请选择项目' }]}>
          <Select placeholder="选择已立项项目" options={projects.map((p: any) => ({ value: p.id, label: `${p.name} (${p.code})` }))} />
        </Form.Item>
        <Form.Item label="变更明细" required>
          <Table
            dataSource={items.map((item, idx) => ({ ...item, idx }))}
            rowKey="idx"
            pagination={false}
            columns={[
              { title: '项目名称', width: 140, render: (_: any, __: any, index: number) => (
                <Input placeholder="如：电缆敷设" value={items[index].name} onChange={(e) => updateItem(index, 'name', e.target.value)} />
              )},
              { title: '规格型号', width: 120, render: (_: any, __: any, index: number) => (
                <Input placeholder="规格" value={items[index].spec} onChange={(e) => updateItem(index, 'spec', e.target.value)} />
              )},
              { title: '单位', width: 60, render: (_: any, __: any, index: number) => (
                <Input placeholder="单位" value={items[index].unit} onChange={(e) => updateItem(index, 'unit', e.target.value)} />
              )},
              { title: '工程量', width: 100, render: (_: any, __: any, index: number) => (
                <InputNumber style={{ width: '100%' }} placeholder="可正可负" value={items[index].quantity} onChange={(v) => updateItem(index, 'quantity', v || 0)} />
              )},
              { title: '综合单价', width: 120, render: (_: any, __: any, index: number) => (
                <InputNumber prefix="¥" style={{ width: '100%' }} placeholder="单价" value={items[index].contractPrice} onChange={(v) => updateItem(index, 'contractPrice', v || 0)} />
              )},
              { title: '小计', width: 120, render: (_: any, __: any, index: number) => {
                const total = (items[index].quantity || 0) * (items[index].contractPrice || 0);
                return <span style={{ color: total < 0 ? '#ff4d4f' : '#262626' }}>¥{total.toLocaleString()}</span>;
              }},
              { title: '操作', width: 60, render: (_: any, __: any, index: number) => (
                <Button type="link" danger icon={<DeleteOutlined />} onClick={() => removeItem(index)} />
              )},
            ]}
          />
          <Button type="dashed" onClick={addItem} icon={<PlusOutlined />} block style={{ marginTop: 8 }}>添加一行</Button>
        </Form.Item>
        <div style={{ textAlign: 'right', fontWeight: 600, fontSize: 16, color: totalAmount < 0 ? '#ff4d4f' : '#262626' }}>
          变更合计：¥{totalAmount.toLocaleString()}
        </div>
      </Form>
    </Modal>
  );
}
