import { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, Button, message, Empty, Card, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { deliveryNoticesApi, purchaseConfirmsApi } from '../../api/purchases';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ContractGroup {
  key: string;
  contractLabel: string;
  supplierName: string;
  deliveryDate?: string;
  deliveryOption?: string;
  transportMethod?: string;
  trackingNumber?: string;
  remark?: string;
}

interface AvailableContract {
  supplierName: string;
  contractAmount: number;
  // Serialized group index as label
  _label: string;
}

export default function DeliveryNoticeForm({ open, onClose, onSuccess }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [approvedConfirms, setApprovedConfirms] = useState<any[]>([]);
  const [selectedConfirmId, setSelectedConfirmId] = useState<number | null>(null);
  const [allContracts, setAllContracts] = useState<AvailableContract[]>([]);
  const [usedContractLabels, setUsedContractLabels] = useState<Set<string>>(new Set());
  const [groups, setGroups] = useState<ContractGroup[]>([]);
  const [contractModalVisible, setContractModalVisible] = useState(false);
  const [currentGroupKey, setCurrentGroupKey] = useState<string>('');
  const [confirmData, setConfirmData] = useState<any>(null);
  const [selectedConfirmCode, setSelectedConfirmCode] = useState<string>('');

  useEffect(() => {
    if (open) {
      loadData();
      form.resetFields();
      setSelectedConfirmId(null);
      setAllContracts([]);
      setUsedContractLabels(new Set());
      setGroups([]);
      setConfirmData(null);
      setSelectedConfirmCode('');
    }
  }, [open]);

  const loadData = async () => {
    try {
      const [confirmsRes, noticesRes]: any = await Promise.all([
        purchaseConfirmsApi.findAll(),
        deliveryNoticesApi.findAll(),
      ]);
      // Compute which contracts are already used across all delivery notices
      const contractUsage = new Set<string>();
      (noticesRes.data || []).forEach((n: any) => {
        try {
          const contracts = JSON.parse(n.contractData || '[]');
          contracts.forEach((c: any) => {
            contractUsage.add(`${n.confirmId}::${c.contractLabel}`);
          });
        } catch { /* skip */ }
      });
      // Store usage map per confirm
      (window as any).__contractUsage = contractUsage;
      setUsedContractLabels(contractUsage);
      setApprovedConfirms((confirmsRes.data || []).filter((c: any) => c.status === 'approved'));
    } catch (err: any) {
      message.error('加载数据失败');
    }
  };

  const handleConfirmSelect = async (confirmId: number) => {
    setSelectedConfirmId(confirmId);
    setGroups([]);
    setAllContracts([]);
    setConfirmData(null);

    try {
      const confirmInfo = approvedConfirms.find((c: any) => c.id === confirmId);
      setSelectedConfirmCode(confirmInfo?.code || '');

      const res: any = await purchaseConfirmsApi.findOne(confirmId);
      const data = res.data || res;
      setConfirmData(data);

      let groupData: any[] = [];
      try { groupData = JSON.parse(data.groupData || '[]'); } catch { groupData = []; }
      const contracts: AvailableContract[] = groupData.map((g: any, idx: number) => ({
        ...g,
        _label: `合同${idx + 1} - ${g.supplierName} (¥${Number(g.contractAmount || 0).toLocaleString()})`,
      }));
      setAllContracts(contracts);
    } catch (err: any) {
      message.error('加载采购确认单详情失败');
    }
  };

  const getAvailableContracts = (currentGroupKey: string): AvailableContract[] => {
    // Used labels from other groups in this form
    const usedInForm = groups
      .filter((g) => g.key !== currentGroupKey && g.contractLabel)
      .map((g) => `${selectedConfirmId}::${g.contractLabel}`);

    // Used labels from existing delivery notices
    const existingUsed = Array.from(usedContractLabels);

    return allContracts.filter((c) => {
      const usageKey = `${selectedConfirmId}::${c._label}`;
      return !usedInForm.includes(usageKey) && !existingUsed.includes(usageKey);
    });
  };

  const addGroup = () => {
    const newKey = `group_${Date.now()}_${groups.length}`;
    setGroups([...groups, { key: newKey, contractLabel: '', supplierName: '' }]);
  };

  const removeGroup = (key: string) => {
    setGroups(groups.filter((g) => g.key !== key));
  };

  const openContractSelector = (key: string) => {
    setCurrentGroupKey(key);
    setContractModalVisible(true);
  };

  const selectContract = (contract: AvailableContract) => {
    setGroups(groups.map((g) => {
      if (g.key === currentGroupKey) {
        return { ...g, contractLabel: contract._label, supplierName: contract.supplierName };
      }
      return g;
    }));
    setContractModalVisible(false);
  };

  const updateGroupField = (key: string, field: string, value: any) => {
    setGroups(groups.map((g) => {
      if (g.key === key) {
        return { ...g, [field]: value };
      }
      return g;
    }));
  };

  const handleFinish = async (values: any) => {
    if (!selectedConfirmId) {
      message.error('请选择采购确认单');
      return;
    }
    if (groups.length === 0 || !groups.some((g) => g.contractLabel)) {
      message.error('请至少添加一个供货通知并选择合同');
      return;
    }

    setLoading(true);
    try {
      const contracts = groups
        .filter((g) => g.contractLabel)
        .map((g) => ({
          contractLabel: g.contractLabel,
          supplierName: g.supplierName,
          deliveryDate: g.deliveryDate || null,
          deliveryOption: g.deliveryOption || null,
          transportMethod: g.transportMethod || null,
          remark: g.remark || null,
        }));

      const payload = {
        confirmId: selectedConfirmId,
        contracts,
        receiver: values.receiver || null,
        phone: values.phone || null,
        address: values.address || null,
      };

      await deliveryNoticesApi.create(payload);
      message.success('创建成功');
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const groupLabels = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

  return (
    <>
      <Modal title="新建供货通知单" open={open} onCancel={onClose} onOk={() => form.submit()} confirmLoading={loading} width={900} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item name="confirmId" label="采购确认单" rules={[{ required: true, message: '请选择采购确认单' }]}>
            <Select
              placeholder="选择已审批的采购确认单"
              onChange={(val) => handleConfirmSelect(val)}
              options={approvedConfirms.map((c: any) => ({ value: c.id, label: `${c.code} - ¥${Number(c.totalAmount).toLocaleString()}` }))}
            />
          </Form.Item>

          <Form.Item name="receiver" label="收货人">
            <Input placeholder="请输入收货人" />
          </Form.Item>
          <Form.Item name="phone" label="电话">
            <Input placeholder="请输入电话" />
          </Form.Item>
          <Form.Item name="address" label="收货地址">
            <Input placeholder="请输入收货地址" />
          </Form.Item>

          <Divider orientation="left" plain>供货通知合同选择</Divider>

          {!selectedConfirmId && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#999' }}>
              请先选择采购确认单
            </div>
          )}

          {selectedConfirmId && (
            <>
              {allContracts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '16px 0', color: '#999' }}>
                  该采购确认单没有合同数据
                </div>
              )}

              {groups.map((group, idx) => {
                const groupName = `供货通知${groupLabels[idx] || (idx + 1)}`;
                return (
                  <Card
                    key={group.key}
                    size="small"
                    title={<span style={{ fontWeight: 600 }}>{groupName}</span>}
                    extra={groups.length > 1 ? (
                      <Button type="link" danger icon={<DeleteOutlined />} onClick={() => removeGroup(group.key)}>
                        删除
                      </Button>
                    ) : null}
                    style={{ marginBottom: 16, background: '#fafafa' }}
                  >
                    {!group.contractLabel ? (
                      <div style={{ textAlign: 'center', padding: '16px 0' }}>
                        <Button type="dashed" icon={<SearchOutlined />} onClick={() => openContractSelector(group.key)}>
                          选择采购合同
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div style={{ marginBottom: 12, padding: '8px 12px', background: '#e6f7ff', borderRadius: 4, border: '1px solid #91d5ff' }}>
                          <span style={{ fontWeight: 500 }}>{group.contractLabel}</span>
                          <Button type="link" size="small" style={{ marginLeft: 12 }} onClick={() => openContractSelector(group.key)}>
                            更换合同
                          </Button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>供货日期</div>
                            <Input type="date" value={group.deliveryDate || ''} onChange={(e) => updateGroupField(group.key, 'deliveryDate', e.target.value)} />
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>到货方式</div>
                            <Select
                              placeholder="选择到货方式"
                              value={group.deliveryOption || undefined}
                              onChange={(val) => updateGroupField(group.key, 'deliveryOption', val)}
                              allowClear
                              options={[
                                { value: '一次性', label: '一次性' },
                                { value: '分批次', label: '分批次' },
                              ]}
                              style={{ width: '100%' }}
                            />
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>运输方式</div>
                            <Select
                              placeholder="选择运输方式"
                              value={group.transportMethod || undefined}
                              onChange={(val) => updateGroupField(group.key, 'transportMethod', val)}
                              allowClear
                              style={{ width: '100%' }}
                            >
                              <Select.Option value="陆运">陆运</Select.Option>
                              <Select.Option value="空运">空运</Select.Option>
                              <Select.Option value="送货上门">送货上门</Select.Option>
                              <Select.Option value="自提">自提</Select.Option>
                            </Select>
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>运单号</div>
                            <Input placeholder="请输入运单号" value={group.trackingNumber || ''} onChange={(e) => updateGroupField(group.key, 'trackingNumber', e.target.value)} />
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>备注</div>
                            <Input.TextArea rows={2} placeholder="请输入备注" value={group.remark || ''} onChange={(e) => updateGroupField(group.key, 'remark', e.target.value)} />
                          </div>
                        </div>
                      </>
                    )}
                  </Card>
                );
              })}

              {allContracts.length > 0 && (
                <Button type="dashed" icon={<PlusOutlined />} block onClick={addGroup} style={{ marginBottom: 16 }}>
                  添加供货通知
                </Button>
              )}
            </>
          )}
        </Form>
      </Modal>

      {/* Contract selection modal */}
      <Modal
        title="选择采购合同"
        open={contractModalVisible}
        onCancel={() => setContractModalVisible(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        {selectedConfirmId && (
          <div>
            <div style={{ marginBottom: 12, fontSize: 13, color: '#666' }}>
              采购确认单：{selectedConfirmCode} — 共 {allContracts.length} 个合同
            </div>
            {getAvailableContracts(currentGroupKey).length === 0 ? (
              <Empty description="没有可选的合同（所有合同已被其他供货通知选择）" />
            ) : (
              <div style={{ maxHeight: 400, overflow: 'auto' }}>
                {getAvailableContracts(currentGroupKey).map((contract, idx) => (
                  <Card
                    key={idx}
                    size="small"
                    hoverable
                    style={{ marginBottom: 8 }}
                    onClick={() => selectContract(contract)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{contract._label}</div>
                        <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                          供应商：{contract.supplierName}
                        </div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#1890ff' }}>
                        ¥{Number(contract.contractAmount || 0).toLocaleString()}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
