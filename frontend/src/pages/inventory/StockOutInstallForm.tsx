import { useState, useEffect } from 'react';
import { Modal, Table, message, InputNumber, Checkbox } from 'antd';
import { projectInventoryApi } from '../../api/inventory';
import request from '../../api/request';

interface Props { open: boolean; onClose: () => void; onSuccess: () => void; projectId: number }

export default function StockOutInstallForm({ open, onClose, onSuccess, projectId }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  useEffect(() => {
    if (open) {
      projectInventoryApi.findByProject(projectId).then((res: any) => {
        const data = res.data || [];
        setItems(data);
        const qtyMap: Record<number, number> = {};
        data.forEach((item: any) => { qtyMap[item.id] = Number(item.quantity); });
        setQuantities(qtyMap);
        setCheckedIds(new Set());
      });
    }
  }, [open, projectId]);

  const toggleCheck = (id: number) => {
    const newChecked = new Set(checkedIds);
    if (newChecked.has(id)) newChecked.delete(id); else newChecked.add(id);
    setCheckedIds(newChecked);
  };

  const columns = [
    { title: '选择', width: 50, render: (_: any, r: any) => <Checkbox checked={checkedIds.has(r.id)} onChange={() => toggleCheck(r.id)} /> },
    { title: '材料', render: (_: any, r: any) => r.materialLib?.name || '-' },
    { title: '规格', render: (_: any, r: any) => r.materialLib?.spec || '-' },
    { title: '单位', width: 50, render: (_: any, r: any) => r.materialLib?.unit || '-' },
    { title: '当前库存', render: (_: any, r: any) => Number(r.quantity) },
    { title: '出库数量', width: 100, render: (_: any, r: any) => (
      <InputNumber min={0} max={Number(r.quantity)} value={quantities[r.id]} onChange={(v) => setQuantities({ ...quantities, [r.id]: v || 0 })} style={{ width: '100%' }} />
    )},
  ];

  const handleSubmit = async () => {
    if (checkedIds.size === 0) { message.error('请选择材料'); return; }
    const outItems = items.filter(i => checkedIds.has(i.id)).map(i => ({ materialLibId: i.materialLibId, quantity: quantities[i.id] || 0 }));

    setLoading(true);
    try {
      await request.post('/project-inventory/stock-out', { projectId, items: outItems });
      message.success('出库成功');
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '出库失败');
    } finally { setLoading(false); }
  };

  return (
    <Modal title="出库（已安装）" open={open} onCancel={onClose} onOk={handleSubmit} confirmLoading={loading} width={700} destroyOnClose>
      <Table dataSource={items} columns={columns} rowKey="id" pagination={false} size="small" />
    </Modal>
  );
}
