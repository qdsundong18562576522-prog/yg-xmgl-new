import { useState, useEffect } from 'react';
import { Table, Button, Card, message, Modal, Descriptions, Form, Select, InputNumber, DatePicker, Space } from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { projectReceivablesApi } from '../../api/finance';
import { useAuthStore } from '../../stores/authStore';
import request from '../../api/request';

const methodOptions = ['银行转账', '现金', '承兑汇票', '保理', '其他'];

export default function ProjectReceivablesPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const user = useAuthStore((s) => s.user);

  const fetch = async () => {
    setLoading(true);
    try {
      const res: any = await projectReceivablesApi.findAll();
      setData(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '项目', key: 'project', dataIndex: ['project', 'name'], ellipsis: true },
    { title: '金额', dataIndex: 'amount', render: (v: any) => `¥${Number(v || 0).toLocaleString()}` },
    { title: '回款方式', dataIndex: 'method' },
    { title: '回款时间', dataIndex: 'receivedTime', render: (v: string) => new Date(v).toLocaleString() },
    { title: '创建人', dataIndex: ['createdBy', 'displayName'], width: 100 },
    { title: '操作', key: 'action', width: 130, render: (_: any, record: any) => (
      <Space>
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setViewItem(record)}>查看</Button>
        {(record.createdById === user?.id || user?.role === 'admin') && (
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => {
            Modal.confirm({
              title: '确认删除',
              content: `确定要删除这笔回款记录（¥${Number(record.amount || 0).toLocaleString()}）吗？`,
              onOk: async () => {
                try {
                  await projectReceivablesApi.delete(record.id);
                  message.success('已删除');
                  fetch();
                } catch (e: any) {
                  message.error(e?.response?.data?.message || '删除失败');
                }
              },
            });
          }}>删除</Button>
        )}
      </Space>
    )},
  ];

  return (
    <div>
      <Card title="项目回款" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>新建回款</Button>}>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>
      <ReceivableForm open={formOpen} onClose={() => setFormOpen(false)} onSuccess={fetch} />
      <Modal title="回款详情" open={!!viewItem} onCancel={() => setViewItem(null)} footer={null} width={600}>
        {viewItem && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="项目" span={2}>{viewItem.project?.name}</Descriptions.Item>
            <Descriptions.Item label="金额">¥{Number(viewItem.amount || 0).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="回款方式">{viewItem.method}</Descriptions.Item>
            <Descriptions.Item label="回款时间" span={2}>{new Date(viewItem.receivedTime).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="创建人">{viewItem.createdBy?.displayName}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(viewItem.createdAt).toLocaleString()}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}

function ReceivableForm({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
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
      await projectReceivablesApi.create({
        ...values,
        receivedTime: values.receivedTime?.toISOString(),
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

  return (
    <Modal title="新建回款记录" open={open} onCancel={onClose} onOk={() => form.submit()} confirmLoading={loading} width={500} destroyOnClose>
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="projectId" label="项目" rules={[{ required: true, message: '请选择项目' }]}>
          <Select placeholder="选择项目" options={projects.map((p: any) => ({ value: p.id, label: `${p.name} (${p.code})` }))} />
        </Form.Item>
        <Form.Item name="amount" label="回款金额" rules={[{ required: true, message: '请输入金额' }]}>
          <InputNumber min={0} prefix="¥" style={{ width: '100%' }} placeholder="请输入回款金额" />
        </Form.Item>
        <Form.Item name="method" label="回款方式" rules={[{ required: true, message: '请选择回款方式' }]}>
          <Select placeholder="选择回款方式" options={methodOptions.map((m) => ({ value: m, label: m }))} />
        </Form.Item>
        <Form.Item name="receivedTime" label="回款时间">
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
