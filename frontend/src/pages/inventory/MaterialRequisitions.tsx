import { useState, useEffect, useMemo } from 'react';
import { Table, Button, Tag, Space, Card, Tabs, message, Modal, Form, Select, InputNumber } from 'antd';
import { PlusOutlined, SendOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { materialRequisitionsApi } from '../../api/inventory';
import { useAuthStore } from '../../stores/authStore';
import request from '../../api/request';

const statusMap: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  pending_purchaser: { color: 'processing', label: '采购审批' },
  pending_leader: { color: 'warning', label: '领导审批' },
  approved: { color: 'success', label: '已通过' },
  rejected: { color: 'error', label: '已驳回' },
};

export default function MaterialRequisitionsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState('all');

  const fetch = async () => {
    setLoading(true);
    try {
      const res: any = await materialRequisitionsApi.findAll();
      setData(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const filtered = activeTab === 'all' ? data : data.filter((p) => p.status === activeTab);

  const handleAction = async (action: string, id: number) => {
    try {
      const api = materialRequisitionsApi as any;
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
    { title: '总成本', dataIndex: 'totalCost', render: (v: any) => `¥${Number(v || 0).toLocaleString()}` },
    { title: '创建人', dataIndex: ['createdBy', 'displayName'], width: 100 },
    { title: '创建时间', dataIndex: 'createdAt', width: 120, render: (v: string) => new Date(v).toLocaleDateString() },
    { title: '状态', dataIndex: 'status', width: 120, render: (s: string) => {
      const m = statusMap[s] || { color: 'default', label: s };
      return <Tag color={m.color}>{m.label}</Tag>;
    }},
    { title: '操作', key: 'action', width: 280, render: (_: any, r: any) => (
      <Space>
        {r.status === 'draft' && <Button type="link" size="small" icon={<SendOutlined />} onClick={() => handleAction('submit', r.id)}>提交</Button>}
        {r.status === 'pending_purchaser' && (user?.role === 'purchaser' || user?.role === 'admin') && <>
          <Button type="link" size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }} onClick={() => handleAction('approvePurchaser', r.id)}>通过</Button>
          <Button type="link" size="small" icon={<CloseCircleOutlined />} danger onClick={() => handleAction('reject', r.id)}>驳回</Button>
        </>}
        {r.status === 'pending_leader' && (user?.role === 'leader' || user?.role === 'admin') && <>
          <Button type="link" size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }} onClick={() => handleAction('approveLeader', r.id)}>通过</Button>
          <Button type="link" size="small" icon={<CloseCircleOutlined />} danger onClick={() => handleAction('reject', r.id)}>驳回</Button>
        </>}
      </Space>
    )},
  ];

  return (
    <div>
      <Card title="材料设备领用单" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>新建领用单</Button>}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}
          items={[
            { key: 'all', label: '全部' },
            { key: 'draft', label: '草稿' },
            { key: 'pending_purchaser', label: '采购审批' },
            { key: 'pending_leader', label: '领导审批' },
            { key: 'approved', label: '已通过' },
            { key: 'rejected', label: '已驳回' },
          ]}
        />
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>
      <RequisitionForm open={formOpen} onClose={() => setFormOpen(false)} onSuccess={fetch} />
    </div>
  );
}

function RequisitionForm({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [companyItems, setCompanyItems] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([{ materialLibId: undefined, quantity: 0, contractPrice: 0 }]);

  useEffect(() => {
    if (open) {
      request.get('/projects').then((res: any) => setProjects(res.data || []));
      request.get('/company-inventory').then((res: any) => setCompanyItems(res.data || []));
      form.resetFields();
      setRows([{ materialLibId: undefined, quantity: 0, contractPrice: 0 }]);
    }
  }, [open, form]);

  const updateRow = (idx: number, field: string, value: any) => {
    const newRows = [...rows];
    newRows[idx] = { ...newRows[idx], [field]: value };
    if (field === 'materialLibId') {
      const item = companyItems.find((c: any) => c.materialLibId === value);
      if (item) newRows[idx].costPrice = Number(item.costPrice);
    }
    setRows(newRows);
  };

  const addRow = () => setRows([...rows, { materialLibId: undefined, quantity: 0, contractPrice: 0 }]);
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx));

  const totalCost = useMemo(() =>
    rows.reduce((sum, r) => sum + (r.quantity || 0) * (r.contractPrice || 0), 0),
    [rows]
  );

  const handleSubmit = async () => {
    const projectId = form.getFieldValue('projectId');
    if (!projectId) { message.error('请选择项目'); return; }
    const validRows = rows.filter((r) => r.materialLibId && r.quantity > 0);
    if (validRows.length === 0) { message.error('请至少添加一条有效明细'); return; }

    setLoading(true);
    try {
      await materialRequisitionsApi.create({
        projectId,
        items: validRows.map((r) => ({
          materialLibId: r.materialLibId,
          quantity: r.quantity,
          costPrice: r.costPrice || 0,
          contractPrice: r.contractPrice || 0,
        })),
      });
      message.success('创建成功');
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const materialOptions = companyItems.map((c: any) => ({
    value: c.materialLibId,
    label: `${c.materialLib?.name || ''} / ${c.materialLib?.brand || ''} / ${c.materialLib?.spec || ''}`,
    costPrice: Number(c.costPrice),
  }));

  return (
    <Modal title="新建领用单" open={open} onCancel={onClose} onOk={handleSubmit} confirmLoading={loading} width={700} destroyOnClose>
      <Form form={form} layout="vertical">
        <Form.Item name="projectId" label="领用项目" rules={[{ required: true }]}>
          <Select placeholder="选择项目" options={projects.map((p: any) => ({ value: p.id, label: `${p.name} (${p.code})` }))} />
        </Form.Item>

        {rows.map((row, idx) => (
          <Space key={idx} style={{ display: 'flex', marginBottom: 8, alignItems: 'flex-start' }}>
            <Select
              placeholder="选择材料"
              showSearch
              style={{ width: 220 }}
              value={row.materialLibId}
              onChange={(v) => updateRow(idx, 'materialLibId', v)}
              options={materialOptions}
              filterOption={(input, option) => (option?.label as string || '').includes(input)}
            />
            <InputNumber placeholder="数量" min={0} style={{ width: 100 }} value={row.quantity} onChange={(v) => updateRow(idx, 'quantity', v || 0)} />
            <InputNumber placeholder="合同单价" prefix="¥" min={0} style={{ width: 120 }} value={row.contractPrice} onChange={(v) => updateRow(idx, 'contractPrice', v || 0)} />
            {rows.length > 1 && <Button type="link" danger onClick={() => removeRow(idx)}>删除</Button>}
          </Space>
        ))}
        <Button type="dashed" onClick={addRow} block style={{ marginBottom: 8 }}>添加一行</Button>

        <div style={{ textAlign: 'right', fontWeight: 600, fontSize: 16 }}>
          合计：¥{totalCost.toLocaleString()}
        </div>
      </Form>
    </Modal>
  );
}
