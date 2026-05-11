import { useState, useEffect, useMemo } from 'react';
import { Modal, Input, InputNumber, Table, message, Select, Space, Checkbox } from 'antd';
import { stockOutApi, projectInventoryApi } from '../../api/inventory';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: number;
}

const REASON_OPTIONS = [
  { value: 'design_change', label: '甲方设计变更' },
  { value: 'solution_optimization', label: '我方方案优化' },
  { value: 'procurement_error', label: '采购数量提报错误' },
  { value: 'other', label: '其他' },
];

export default function StockOutForm({ open, onClose, onSuccess, projectId }: Props) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [reasonType, setReasonType] = useState<string>('design_change');
  const [reasonDetail, setReasonDetail] = useState<string>('');

  useEffect(() => {
    if (open) {
      projectInventoryApi.findByProject(projectId).then((res: any) => {
        const data = res.data || [];
        setItems(data);
        const qtyMap: Record<number, number> = {};
        data.forEach((item: any) => { qtyMap[item.id] = Number(item.quantity); });
        setQuantities(qtyMap);
        setCheckedIds(new Set());
        setReasonType('design_change');
        setReasonDetail('');
      });
    }
  }, [open, projectId]);

  const toggleCheck = (id: number) => {
    const newChecked = new Set(checkedIds);
    if (newChecked.has(id)) newChecked.delete(id);
    else newChecked.add(id);
    setCheckedIds(newChecked);
  };

  const updateQty = (id: number, val: number | null) => {
    setQuantities({ ...quantities, [id]: val || 0 });
  };

  const totalCost = useMemo(() => {
    return items.filter((i) => checkedIds.has(i.id)).reduce((sum, i) => {
      const qty = quantities[i.id] || 0;
      return sum + qty * Number(i.costPrice);
    }, 0);
  }, [items, checkedIds, quantities]);

  const handleSubmit = async () => {
    if (checkedIds.size === 0) {
      message.error('请至少选择一项材料');
      return;
    }

    const transferItems = items
      .filter((i) => checkedIds.has(i.id))
      .map((i) => ({
        materialLibId: i.materialLibId,
        quantity: quantities[i.id] || 0,
        costPrice: Number(i.costPrice),
      }));

    setLoading(true);
    try {
      await stockOutApi.create({ projectId, reasonType, reasonDetail: reasonDetail || undefined, items: transferItems });
      message.success('转库存申请已提交');
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '提交失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '选择', width: 50,
      render: (_: any, record: any) => (
        <Checkbox checked={checkedIds.has(record.id)} onChange={() => toggleCheck(record.id)} />
      ),
    },
    { title: '材料名称', render: (_: any, r: any) => r.materialLib?.name || '-' },
    { title: '品牌', render: (_: any, r: any) => r.materialLib?.brand || '-' },
    { title: '规格', render: (_: any, r: any) => r.materialLib?.spec || '-' },
    { title: '单位', width: 50, render: (_: any, r: any) => r.materialLib?.unit || '-' },
    { title: '当前库存', render: (_: any, r: any) => Number(r.quantity) },
    { title: '成本单价', render: (_: any, r: any) => `¥${Number(r.costPrice).toLocaleString()}` },
    {
      title: '转出数量', width: 100,
      render: (_: any, record: any) => (
        <InputNumber min={0} max={Number(record.quantity)} value={quantities[record.id]} onChange={(v) => updateQty(record.id, v)} style={{ width: '100%' }} />
      ),
    },
  ];

  return (
    <Modal title="一键转公司库存" open={open} onCancel={onClose} onOk={handleSubmit} confirmLoading={loading} width={800} destroyOnClose>
      <Table dataSource={items} columns={columns} rowKey="id" pagination={false} size="small" />
      <div style={{ marginTop: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>转出原因</div>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select value={reasonType} onChange={setReasonType} options={REASON_OPTIONS} style={{ width: 300 }} />
          <Input placeholder="具体事项说明" value={reasonDetail} onChange={(e) => setReasonDetail(e.target.value)} />
        </Space>
      </div>
      <div style={{ textAlign: 'right', marginTop: 12, fontWeight: 600, fontSize: 16 }}>
        转出总额：¥{totalCost.toLocaleString()}
      </div>
    </Modal>
  );
}
