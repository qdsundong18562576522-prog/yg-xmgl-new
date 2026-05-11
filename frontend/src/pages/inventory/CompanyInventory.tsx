import { useState, useEffect } from 'react';
import { Table, Button, Space, Card, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { companyInventoryApi } from '../../api/inventory';
import { useAuthStore } from '../../stores/authStore';
import CompanyInventoryForm from './CompanyInventoryForm';

export default function CompanyInventoryPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const user = useAuthStore((s) => s.user);
  const canEdit = user && (user.role === 'purchaser' || user.role === 'admin');

  const fetch = async () => {
    setLoading(true);
    try {
      const res: any = await companyInventoryApi.findAll();
      setData(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleDelete = async (id: number) => {
    try { await companyInventoryApi.delete(id); message.success('已删除'); fetch(); }
    catch (err: any) { message.error(err?.response?.data?.message || '删除失败'); }
  };

  const columns = [
    { title: '材料名称', key: 'name', render: (_: any, r: any) => r.materialLib?.name || '-' },
    { title: '品牌', key: 'brand', render: (_: any, r: any) => r.materialLib?.brand || '-' },
    { title: '规格型号', key: 'spec', render: (_: any, r: any) => r.materialLib?.spec || '-' },
    { title: '单位', key: 'unit', render: (_: any, r: any) => r.materialLib?.unit || '-', width: 60 },
    { title: '库存数量', dataIndex: 'quantity', key: 'qty', render: (v: any) => Number(v || 0) },
    { title: '成本单价', dataIndex: 'costPrice', key: 'price', render: (v: any) => `¥${Number(v || 0).toLocaleString()}` },
    { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
    ...(canEdit ? [{
      title: '操作', key: 'action', width: 150,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditItem(record); setFormOpen(true); }}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ];

  return (
    <div>
      <Card title="公司库存" extra={canEdit ? <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditItem(null); setFormOpen(true); }}>新增库存</Button> : undefined}>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 15 }} />
      </Card>
      <CompanyInventoryForm open={formOpen} onClose={() => { setFormOpen(false); setEditItem(null); }} onSuccess={fetch} editData={editItem} />
    </div>
  );
}
