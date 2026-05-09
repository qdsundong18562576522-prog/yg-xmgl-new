import { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Select, Input, InputNumber, Button, Table, message, Space, Divider, Statistic } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { inquiryOrdersApi, purchaseRequestsApi } from '../../api/purchases';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: any;
}

export default function InquiryOrderForm({ open, onClose, onSuccess, editData }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [approvedPrs, setApprovedPrs] = useState<any[]>([]);
  const [prItems, setPrItems] = useState<any[]>([]);
  const [purchasePrices, setPurchasePrices] = useState<number[]>([]);
  const [extraItems, setExtraItems] = useState<any[]>([]);
  const [selectedPrId, setSelectedPrId] = useState<number | null>(null);
  const isEdit = !!editData;

  useEffect(() => {
    if (open) {
      purchaseRequestsApi.findAll().then((res: any) => {
        const items = (res.data || []).filter((p: any) => p.status === 'approved');
        setApprovedPrs(items);
      });

      if (editData) {
        // Load the edit data
        const items = editData.items?.filter((i: any) => !i.isExtra) || [];
        const extras = editData.items?.filter((i: any) => i.isExtra) || [];
        setPrItems(items);
        setPurchasePrices(items.map((i: any) => Number(i.purchasePrice)));
        setExtraItems(extras.map((i: any) => ({ name: i.name, amount: Number(i.totalPrice) })));
        setSelectedPrId(editData.prId);
        form.setFieldsValue({ prId: editData.prId });
      } else {
        form.resetFields();
        setPrItems([]);
        setPurchasePrices([]);
        setExtraItems([]);
        setSelectedPrId(null);
      }
    }
  }, [open, editData, form]);

  const handlePrSelect = async (prId: number) => {
    if (isEdit) return; // Don't reload in edit mode
    setSelectedPrId(prId);
    try {
      const res: any = await purchaseRequestsApi.findOne(prId);
      const items = res.data?.items || [];
      setPrItems(items);
      setPurchasePrices(items.map((i: any) => Number(i.contractPrice)));
    } catch {
      setPrItems([]);
      setPurchasePrices([]);
    }
  };

  const updatePurchasePrice = (index: number, value: number | null) => {
    const newPrices = [...purchasePrices];
    newPrices[index] = value || 0;
    setPurchasePrices(newPrices);
  };

  const materialTotal = useMemo(() =>
    prItems.reduce((sum, item, i) => sum + Number(item.quantity) * (purchasePrices[i] || 0), 0),
    [prItems, purchasePrices]
  );

  const extraTotal = useMemo(() =>
    extraItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [extraItems]
  );

  const grandTotal = materialTotal + extraTotal;

  const handleFinish = async (values: any) => {
    if (!selectedPrId && !isEdit) {
      message.error('请选择采购申请');
      return;
    }
    setLoading(true);
    try {
      if (isEdit && editData) {
        await inquiryOrdersApi.update(editData.id, {
          purchasePrices,
          extraItems: extraItems.filter((e) => e.name).map((e) => ({ name: e.name, amount: e.amount || 0 })),
        });
        message.success('更新成功');
      } else {
        await inquiryOrdersApi.create({
          prId: values.prId,
          purchasePrices,
          extraItems: extraItems.filter((e) => e.name).map((e) => ({ name: e.name, amount: e.amount || 0 })),
        });
        message.success('创建成功');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const prCols = [
    { title: '材料名称', dataIndex: 'name', width: 160 },
    { title: '品牌', dataIndex: 'brand', width: 100 },
    { title: '规格型号', dataIndex: 'spec', width: 120 },
    { title: '单位', dataIndex: 'unit', width: 60 },
    { title: '数量', dataIndex: 'quantity', width: 80 },
    {
      title: '采购单价', key: 'pp', width: 140,
      render: (_: any, __: any, i: number) => (
        <InputNumber min={0} prefix="¥" style={{ width: '100%' }} value={purchasePrices[i]} onChange={(v) => updatePurchasePrice(i, v)} placeholder="采购单价" />
      ),
    },
    {
      title: '合价', key: 'total', width: 120,
      render: (_: any, __: any, i: number) => {
        const total = Number(prItems[i]?.quantity || 0) * (purchasePrices[i] || 0);
        return <span>¥{total.toLocaleString()}</span>;
      },
    },
  ];

  return (
    <Modal title={isEdit ? '编辑询价单' : '新建询价单'} open={open} onCancel={onClose} onOk={() => form.submit()} confirmLoading={loading} width={800} destroyOnClose>
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="prId" label="关联采购申请" rules={[{ required: true }]}>
          <Select
            placeholder="选择已审批的采购申请"
            disabled={isEdit}
            options={approvedPrs.map((p: any) => ({ value: p.id, label: `${p.code} - ${p.project?.name || ''} (¥${Number(p.totalAmount).toLocaleString()})` }))}
            onChange={handlePrSelect}
          />
        </Form.Item>

        {prItems.length > 0 && (
          <Form.Item label="采购明细">
            <Table dataSource={prItems.map((item, i) => ({ ...item, _row: i }))} rowKey={(r) => r.id || r._row} pagination={false} size="small" columns={prCols} />
          </Form.Item>
        )}

        <Form.Item label="额外费用（非必填 — 安装调试费、税金、运费、优惠等，可正可负）">
          {extraItems.map((_, i) => (
            <Space key={i} style={{ display: 'flex', marginBottom: 8, alignItems: 'center' }}>
              <Input
                placeholder="费用名称"
                value={extraItems[i]?.name}
                onChange={(e) => { const n = [...extraItems]; n[i] = { ...n[i], name: e.target.value }; setExtraItems(n); }}
                style={{ width: 200 }}
              />
              <InputNumber
                placeholder="金额（可负）"
                prefix="¥"
                value={extraItems[i]?.amount}
                onChange={(v) => { const n = [...extraItems]; n[i] = { ...n[i], amount: v || 0 }; setExtraItems(n); }}
                style={{ width: 160 }}
              />
              <Button type="link" danger icon={<DeleteOutlined />} onClick={() => setExtraItems(extraItems.filter((_, j) => j !== i))} />
            </Space>
          ))}
          <Button type="dashed" icon={<PlusOutlined />} onClick={() => setExtraItems([...extraItems, { name: '', amount: 0 }])}>添加额外费用</Button>
        </Form.Item>

        <Divider />
        <div style={{ textAlign: 'right' }}>
          <Space size="large">
            <Statistic title="材料采购小计" value={materialTotal} prefix="¥" precision={2} />
            <Statistic title="额外费用小计" value={extraTotal} prefix="¥" precision={2} />
            <Statistic title="采购总价" value={grandTotal} prefix="¥" precision={2} valueStyle={{ color: '#1890ff', fontWeight: 'bold' }} />
          </Space>
        </div>
      </Form>
    </Modal>
  );
}
