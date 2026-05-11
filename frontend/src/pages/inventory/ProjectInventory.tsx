import { useState, useEffect } from 'react';
import { Table, Button, Card, Select, message } from 'antd';
import { ArrowUpOutlined } from '@ant-design/icons';
import { projectInventoryApi } from '../../api/inventory';
import request from '../../api/request';
import StockOutForm from './StockOutForm';

export default function ProjectInventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);
  const [stockOutOpen, setStockOutOpen] = useState(false);

  useEffect(() => {
    request.get('/projects').then((res: any) => setProjects(res.data || []));
  }, []);

  const fetchInventory = async (projectId?: number) => {
    setLoading(true);
    try {
      const res: any = await projectInventoryApi.findByProject(projectId);
      setInventory(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInventory(selectedProjectId); }, [selectedProjectId]);

  const columns = [
    { title: '材料名称', key: 'name', render: (_: any, r: any) => r.materialLib?.name || '-' },
    { title: '品牌', key: 'brand', render: (_: any, r: any) => r.materialLib?.brand || '-' },
    { title: '规格型号', key: 'spec', render: (_: any, r: any) => r.materialLib?.spec || '-' },
    { title: '单位', key: 'unit', render: (_: any, r: any) => r.materialLib?.unit || '-', width: 60 },
    { title: '数量', dataIndex: 'quantity', render: (v: any) => Number(v || 0) },
    { title: '成本单价', dataIndex: 'costPrice', render: (v: any) => `¥${Number(v || 0).toLocaleString()}` },
  ];

  return (
    <div>
      <Card title="项目库存">
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <Select
            placeholder="选择项目"
            style={{ width: 300 }}
            allowClear
            value={selectedProjectId}
            onChange={(val) => setSelectedProjectId(val)}
            options={projects.map((p: any) => ({ value: p.id, label: `${p.name} (${p.code})` }))}
          />
          {selectedProjectId && (
            <Button type="primary" icon={<ArrowUpOutlined />} onClick={() => setStockOutOpen(true)}>
              一键转公司库存
            </Button>
          )}
        </div>
        <Table dataSource={inventory} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 15 }} />
      </Card>
      <StockOutForm open={stockOutOpen} onClose={() => setStockOutOpen(false)} onSuccess={() => fetchInventory(selectedProjectId)} projectId={selectedProjectId!} />
    </div>
  );
}
