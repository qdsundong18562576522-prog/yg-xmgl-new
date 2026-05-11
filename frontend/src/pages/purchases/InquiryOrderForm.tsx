import { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Select, Input, InputNumber, Button, Table, message, Space, Divider, Statistic, Checkbox, Card } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { inquiryOrdersApi, purchaseRequestsApi } from '../../api/purchases';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: any;
}

interface GroupItem {
  prItemId: number;
  name: string;
  brand: string;
  spec: string;
  unit: string;
  quantity: number;
  purchasePrice: number;
}

interface ExtraItem {
  name: string;
  amount: number;
}

interface Group {
  label: string;
  supplierName: string;
  items: GroupItem[];
  extraItems: ExtraItem[];
  remark: string;
}

export default function InquiryOrderForm({ open, onClose, onSuccess, editData }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [approvedPrs, setApprovedPrs] = useState<any[]>([]);
  const [prItems, setPrItems] = useState<any[]>([]);
  const [selectedPrId, setSelectedPrId] = useState<number | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectModalOpen, setSelectModalOpen] = useState<number | null>(null);
  const [modalCheckedIds, setModalCheckedIds] = useState<number[]>([]);
  const isEdit = !!editData;

  useEffect(() => {
    if (open) {
      purchaseRequestsApi.findAll().then((res: any) => {
        setApprovedPrs((res.data || []).filter((p: any) => p.status === 'approved'));
      });
      form.resetFields();
      if (!editData) {
        setPrItems([]);
        setSelectedPrId(null);
        setGroups([]);
      }
    }
  }, [open, editData, form]);

  const handlePrSelect = async (prId: number) => {
    setSelectedPrId(prId);
    setGroups([]);
    try {
      const res: any = await purchaseRequestsApi.findOne(prId);
      setPrItems(res.data?.items || []);
    } catch {
      setPrItems([]);
    }
  };

  const addGroup = () => {
    const label = `采购询价${['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][groups.length] || (groups.length + 1)}`;
    setGroups([...groups, { label, supplierName: '', items: [], extraItems: [], remark: '' }]);
  };

  const updateGroup = (index: number, data: Partial<Group>) => {
    const newGroups = [...groups];
    newGroups[index] = { ...newGroups[index], ...data };
    setGroups(newGroups);
  };

  const updatePurchasePrice = (groupIdx: number, itemIdx: number, value: number | null) => {
    const group = groups[groupIdx];
    const newItems = [...group.items];
    newItems[itemIdx] = { ...newItems[itemIdx], purchasePrice: value || 0 };
    updateGroup(groupIdx, { items: newItems });
  };

  const updateExtraItem = (groupIdx: number, itemIdx: number, field: 'name' | 'amount', value: string | number) => {
    const group = groups[groupIdx];
    const newExtras = [...group.extraItems];
    newExtras[itemIdx] = { ...newExtras[itemIdx], [field]: value };
    updateGroup(groupIdx, { extraItems: newExtras });
  };

  const addExtraItem = (groupIdx: number) => {
    const group = groups[groupIdx];
    updateGroup(groupIdx, { extraItems: [...group.extraItems, { name: '', amount: 0 }] });
  };

  const removeExtraItem = (groupIdx: number, itemIdx: number) => {
    const group = groups[groupIdx];
    updateGroup(groupIdx, { extraItems: group.extraItems.filter((_, i) => i !== itemIdx) });
  };

  const removeGroup = (index: number) => {
    setGroups(groups.filter((_, i) => i !== index));
  };

  // Compute which PR items are already selected across all groups
  const selectedItemIds = useMemo(() => new Set(groups.flatMap((g) => g.items.map((i) => i.prItemId))), [groups]);

  const openSelectModal = (gIdx: number) => {
    const group = groups[gIdx];
    setModalCheckedIds(group.items.map((i) => i.prItemId));
    setSelectModalOpen(gIdx);
  };

  const handleSelectConfirm = () => {
    if (selectModalOpen === null) return;
    const newItems = prItems
      .filter((item: any) => modalCheckedIds.includes(item.id))
      .map((item: any) => ({
        prItemId: item.id,
        name: item.name,
        brand: item.brand,
        spec: item.spec,
        unit: item.unit,
        quantity: Number(item.quantity),
        purchasePrice: 0,
      }));
    updateGroup(selectModalOpen, { items: newItems });
    setSelectModalOpen(null);
  };

  // Compute subtotals
  const groupSubtotals = useMemo(() => {
    return groups.map((g) => {
      const materialTotal = g.items.reduce((sum, item) => sum + item.quantity * (item.purchasePrice || 0), 0);
      const extraTotal = g.extraItems.reduce((sum, e) => sum + (e.amount || 0), 0);
      return materialTotal + extraTotal;
    });
  }, [groups]);

  const grandTotal = groupSubtotals.reduce((sum, s) => sum + s, 0);

  const handleFinish = async () => {
    if (!selectedPrId && !isEdit) {
      message.error('请选择采购申请');
      return;
    }
    if (groups.length === 0) {
      message.error('请至少添加一个采购询价分组');
      return;
    }
    for (let i = 0; i < groups.length; i++) {
      if (!groups[i].supplierName) {
        message.error(`请填写${groups[i].label}的供货商`);
        return;
      }
      if (groups[i].items.length === 0) {
        message.error(`${groups[i].label}未选择任何材料`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        prId: selectedPrId,
        groups: groups.map((g) => ({
          label: g.label,
          supplierName: g.supplierName,
          itemIds: g.items.map((i) => i.prItemId),
          purchasePrices: g.items.map((i) => i.purchasePrice),
          extraItems: g.extraItems.filter((e) => e.name).map((e) => ({ name: e.name, amount: e.amount })),
          remark: g.remark || undefined,
        })),
      };

      if (isEdit && editData) {
        await inquiryOrdersApi.update(editData.id, payload);
        message.success('更新成功');
      } else {
        await inquiryOrdersApi.create(payload);
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

  // Selection modal columns
  const selectColumns = [
    {
      title: '选择', width: 50,
      render: (_: any, record: any) => {
        const otherGroupItemIds = new Set(
          groups.flatMap((g, idx) => idx === selectModalOpen ? [] : g.items.map((i) => i.prItemId))
        );
        const disabled = otherGroupItemIds.has(record.id);
        return (
          <Checkbox
            checked={modalCheckedIds.includes(record.id)}
            disabled={disabled}
            onChange={(e) => {
              if (e.target.checked) {
                setModalCheckedIds([...modalCheckedIds, record.id]);
              } else {
                setModalCheckedIds(modalCheckedIds.filter((id) => id !== record.id));
              }
            }}
          />
        );
      },
    },
    { title: '材料名称', dataIndex: 'name' },
    { title: '品牌', dataIndex: 'brand' },
    { title: '规格', dataIndex: 'spec' },
    { title: '单位', dataIndex: 'unit', width: 50 },
    { title: '数量', dataIndex: 'quantity', width: 60 },
    { title: '合同单价', dataIndex: 'contractPrice', width: 100, render: (v: any) => `¥${Number(v).toLocaleString()}` },
  ];

  return (
    <Modal title={isEdit ? '编辑询价单' : '新建询价单'} open={open} onCancel={onClose} onOk={handleFinish} confirmLoading={loading} width={900} destroyOnClose>
      <Form form={form} layout="vertical">
        <Form.Item label="关联采购申请" required>
          <Select
            placeholder="选择已审批的采购申请"
            disabled={isEdit}
            value={selectedPrId}
            onChange={handlePrSelect}
            options={approvedPrs.map((p: any) => ({ value: p.id, label: `${p.code} - ${p.project?.name || ''} (¥${Number(p.totalAmount).toLocaleString()})` }))}
          />
        </Form.Item>

        {groups.map((group, gIdx) => (
          <Card
            key={gIdx}
            title={group.label}
            size="small"
            style={{ marginBottom: 12 }}
            extra={groups.length > 1 ? <Button type="link" danger icon={<DeleteOutlined />} onClick={() => removeGroup(gIdx)}>删除</Button> : null}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input
                placeholder="输入供货商名称"
                value={group.supplierName}
                onChange={(e) => updateGroup(gIdx, { supplierName: e.target.value })}
                style={{ width: 300 }}
              />

              <Button type="dashed" onClick={() => openSelectModal(gIdx)}>
                选择采购明细
              </Button>

              {group.items.length > 0 && (
                <Table
                  dataSource={group.items}
                  rowKey="prItemId"
                  pagination={false}
                  size="small"
                  columns={[
                    { title: '材料名称', dataIndex: 'name' },
                    { title: '品牌', dataIndex: 'brand' },
                    { title: '规格', dataIndex: 'spec' },
                    { title: '单位', dataIndex: 'unit', width: 50 },
                    { title: '数量', dataIndex: 'quantity', width: 60 },
                    {
                      title: '采购单价', width: 130,
                      render: (_: any, record: any) => {
                        const itemIdx = group.items.findIndex((i) => i.prItemId === record.prItemId);
                        return (
                          <InputNumber
                            min={0} prefix="¥" style={{ width: '100%' }}
                            value={group.items[itemIdx]?.purchasePrice}
                            onChange={(v) => updatePurchasePrice(gIdx, itemIdx, v || 0)}
                            placeholder="单价"
                          />
                        );
                      },
                    },
                    {
                      title: '合价', width: 100,
                      render: (_: any, record: any) => (
                        <span>¥{(record.quantity * (record.purchasePrice || 0)).toLocaleString()}</span>
                      ),
                    },
                  ]}
                />
              )}

              <Divider style={{ margin: '8px 0' }} />

              <div style={{ fontSize: 13, fontWeight: 500 }}>额外费用（可正可负）</div>
              {group.extraItems.map((_, eIdx) => (
                <Space key={eIdx} style={{ display: 'flex', marginBottom: 4 }}>
                  <Input placeholder="费用名称" value={group.extraItems[eIdx]?.name} onChange={(e) => updateExtraItem(gIdx, eIdx, 'name', e.target.value)} style={{ width: 180 }} />
                  <InputNumber placeholder="金额" prefix="¥" value={group.extraItems[eIdx]?.amount} onChange={(v) => updateExtraItem(gIdx, eIdx, 'amount', v || 0)} style={{ width: 140 }} />
                  <Button type="link" danger icon={<DeleteOutlined />} onClick={() => removeExtraItem(gIdx, eIdx)} />
                </Space>
              ))}
              <Button type="dashed" icon={<PlusOutlined />} size="small" onClick={() => addExtraItem(gIdx)} style={{ width: 120 }}>添加费用</Button>

              <Input.TextArea rows={1} placeholder="备注" value={group.remark} onChange={(e) => updateGroup(gIdx, { remark: e.target.value })} style={{ marginTop: 8 }} />

              <div style={{ textAlign: 'right', fontWeight: 600, color: '#1890ff' }}>
                {group.label}小计：¥{groupSubtotals[gIdx].toLocaleString()}
              </div>
            </Space>
          </Card>
        ))}

        {prItems.length > 0 && (
          <Button type="dashed" icon={<PlusOutlined />} onClick={addGroup} block style={{ marginBottom: 16 }}>
            添加采购询价
          </Button>
        )}

        <Divider />
        <div style={{ textAlign: 'right' }}>
          <Statistic title="采购合计" value={grandTotal} prefix="¥" precision={2} valueStyle={{ color: '#1890ff', fontWeight: 'bold', fontSize: 24 }} />
        </div>
      </Form>

      {/* Selection Modal */}
      <Modal
        title="选择采购明细"
        open={selectModalOpen !== null}
        onCancel={() => setSelectModalOpen(null)}
        onOk={handleSelectConfirm}
        width={800}
        destroyOnClose
      >
        <Table
          dataSource={prItems}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
          columns={selectColumns}
        />
      </Modal>
    </Modal>
  );
}
