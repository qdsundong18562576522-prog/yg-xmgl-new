import { useState, useEffect } from 'react';
import { Table, Button, Space, Card, Input, Modal, Form, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { materialsApi } from '../../api/materials';
import type { Material } from '../../api/materials';
import { useAuthStore } from '../../stores/authStore';

export default function MaterialsPage() {
  const [data, setData] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Material | null>(null);
  const [form] = Form.useForm();
  const user = useAuthStore((s) => s.user);
  const canEdit = user && (user.role === 'purchaser' || user.role === 'admin');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res: any = await materialsApi.findAll(search || undefined);
      setData(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search]);

  const handleSubmit = async (values: any) => {
    try {
      if (editItem) {
        await materialsApi.update(editItem.id, values);
        message.success('更新成功');
      } else {
        await materialsApi.create(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      setEditItem(null);
      form.resetFields();
      fetchData();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await materialsApi.delete(id);
      message.success('已删除');
      fetchData();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '删除失败');
    }
  };

  const openEdit = (item: Material) => {
    setEditItem(item);
    form.setFieldsValue(item);
    setModalOpen(true);
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '品牌', dataIndex: 'brand', key: 'brand' },
    { title: '规格型号', dataIndex: 'spec', key: 'spec' },
    { title: '单位', dataIndex: 'unit', key: 'unit', width: 80 },
    ...(canEdit ? [{
      title: '操作', key: 'action', width: 150,
      render: (_: any, record: Material) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ];

  return (
    <div>
      <Card
        title="材料设备库"
        extra={canEdit ? <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditItem(null); form.resetFields(); setModalOpen(true); }}>新增材料</Button> : undefined}
      >
        <Input
          placeholder="搜索材料名称、品牌、规格..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 320, marginBottom: 16 }}
          allowClear
        />
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 15 }} />
      </Card>

      <Modal
        title={editItem ? '编辑材料' : '新增材料'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditItem(null); }}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="brand" label="品牌" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="spec" label="规格型号" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="unit" label="单位" rules={[{ required: true }]}>
            <Input placeholder="如：台、套、米、个" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
