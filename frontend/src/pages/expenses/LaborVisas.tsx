import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Card, Tabs, message, Modal, Descriptions, Timeline, Form, Select, Input, InputNumber } from 'antd';
import { PlusOutlined, SendOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { laborVisasApi } from '../../api/expenses';
import { useAuthStore } from '../../stores/authStore';
import request from '../../api/request';

const statusMap: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  pending: { color: 'processing', label: '审批中' },
  approved: { color: 'success', label: '已通过' },
  rejected: { color: 'error', label: '已驳回' },
};

export default function LaborVisasPage() {
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
      const res: any = await laborVisasApi.findAll();
      setData(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const filtered = activeTab === 'all' ? data : data.filter((p) => p.status === activeTab);

  const handleAction = async (action: string, id: number) => {
    try {
      const api = laborVisasApi as any;
      if (api[action]) await api[action](id);
      message.success('操作成功');
      fetch();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '操作失败');
    }
  };

  const columns = [
    { title: '编号', dataIndex: 'code', key: 'code', width: 200 },
    { title: '劳务合同', key: 'contract', dataIndex: ['laborContract', 'code'], ellipsis: true },
    { title: '金额变更', dataIndex: 'amountChange', key: 'amountChange', render: (v: number) => {
      const n = Number(v || 0);
      return <span style={{ color: n >= 0 ? '#52c41a' : '#ff4d4f' }}>{n >= 0 ? '+' : ''}¥{n.toLocaleString()}</span>;
    }},
    { title: '原因说明', dataIndex: 'reasonCalc', key: 'reasonCalc', ellipsis: true },
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
            request.get('/approval-history', { params: { entityType: 'labor-visa', entityId: record.id } })
              .then((res: any) => setApprovalHistory(res.data || []))
              .catch(() => setApprovalHistory([]));
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
      ),
    },
  ];

  return (
    <div>
      <Card title="劳务签证" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>新建劳务签证</Button>}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}
          items={[
            { key: 'all', label: '全部' },
            { key: 'draft', label: '草稿' },
            { key: 'pending', label: '审批中' },
            { key: 'approved', label: '已通过' },
            { key: 'rejected', label: '已驳回' },
          ]}
        />
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>
      <LaborVisaForm open={formOpen} onClose={() => setFormOpen(false)} onSuccess={fetch} />
      <Modal title="劳务签证详情" open={!!viewItem} onCancel={() => setViewItem(null)} footer={null} width={720}>
        {viewItem && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="编号" span={2}>{viewItem.code}</Descriptions.Item>
            <Descriptions.Item label="劳务合同" span={2}>{viewItem.laborContract?.code}</Descriptions.Item>
            <Descriptions.Item label="金额变更" span={2}>
              <span style={{ color: (viewItem.amountChange || 0) >= 0 ? '#52c41a' : '#ff4d4f' }}>
                {(viewItem.amountChange || 0) >= 0 ? '+' : ''}¥{Number(viewItem.amountChange || 0).toLocaleString()}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="原因说明" span={2}>{viewItem.reasonCalc}</Descriptions.Item>
            <Descriptions.Item label="创建人">{viewItem.createdBy?.displayName}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(viewItem.createdAt).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="状态" span={2}>{statusMap[viewItem.status]?.label || viewItem.status}</Descriptions.Item>
            {viewItem.remark && <Descriptions.Item label="备注" span={2}>{viewItem.remark}</Descriptions.Item>}
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

function LaborVisaForm({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [laborContracts, setLaborContracts] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      request.get('/labor-contracts', { params: { status: 'approved' } }).then((res: any) => setLaborContracts(res.data || []));
      form.resetFields();
    }
  }, [open, form]);

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      await laborVisasApi.create(values);
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
    <Modal title="新建劳务签证" open={open} onCancel={onClose} onOk={() => form.submit()} confirmLoading={loading} width={600} destroyOnClose>
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="laborContractId" label="劳务合同" rules={[{ required: true, message: '请选择劳务合同' }]}>
          <Select placeholder="选择已通过的劳务合同" options={laborContracts.map((lc: any) => ({
            value: lc.id,
            label: `${lc.code} - ¥${Number(lc.amount || 0).toLocaleString()}`,
          }))} />
        </Form.Item>
        <Form.Item name="reasonCalc" label="原因说明" rules={[{ required: true, message: '请输入原因说明' }]}>
          <Input.TextArea rows={3} placeholder="请输入签证原因及计算说明" />
        </Form.Item>
        <Form.Item name="amountChange" label="金额变更" rules={[{ required: true, message: '请输入金额变更' }]}>
          <InputNumber prefix="¥" style={{ width: '100%' }} placeholder="可输入负数表示减少" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
