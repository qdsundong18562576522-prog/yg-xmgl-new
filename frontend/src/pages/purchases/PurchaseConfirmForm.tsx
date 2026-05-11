import { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, InputNumber, Button, message, Space, Divider, Statistic, Card, Upload, List } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { purchaseConfirmsApi, inquiryOrdersApi } from '../../api/purchases';
import request from '../../api/request';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PurchaseGroup {
  label: string;
  supplierName: string;
  contractAmount: number;
  deliveryPaymentTerms: string;
  supplyCycle: string | undefined;
  contractFile: string;
}

const GROUP_LABELS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

const SUPPLY_CYCLE_OPTIONS = [
  { value: '7天', label: '7天' },
  { value: '15天', label: '15天' },
  { value: '30天', label: '30天' },
  { value: '45天', label: '45天' },
  { value: '60天', label: '60天' },
  { value: '90天', label: '90天' },
];

export default function PurchaseConfirmForm({ open, onClose, onSuccess }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [approvedInquiries, setApprovedInquiries] = useState<any[]>([]);
  const [inquirySuppliers, setInquirySuppliers] = useState<string[]>([]);
  const [supplierModalGroup, setSupplierModalGroup] = useState<number | null>(null);
  const [groups, setGroups] = useState<PurchaseGroup[]>([
    { label: '采购合同一', supplierName: '', contractAmount: 0, deliveryPaymentTerms: '', supplyCycle: undefined, contractFile: '' },
  ]);

  useEffect(() => {
    if (open) {
      inquiryOrdersApi.findAll().then((res: any) => {
        setApprovedInquiries((res.data || []).filter((i: any) => i.status === 'approved'));
      });
      form.resetFields();
      setInquirySuppliers([]);
      setGroups([
        { label: '采购合同一', supplierName: '', contractAmount: 0, deliveryPaymentTerms: '', supplyCycle: undefined, contractFile: '' },
      ]);
    }
  }, [open, form]);

  const handleInquirySelect = async (inquiryId: number) => {
    try {
      const res: any = await inquiryOrdersApi.findOne(inquiryId);
      const items = res.data?.items || [];
      // Extract unique supplier names from inquiry items
      const suppliers = [...new Set(items.filter((i: any) => i.supplierName && !i.isExtra).map((i: any) => i.supplierName))];
      setInquirySuppliers(suppliers);
    } catch {
      setInquirySuppliers([]);
    }
  };

  // Get suppliers already selected by OTHER groups
  const getAvailableSuppliers = (currentGroupIdx: number) => {
    const selected = groups
      .filter((_, i) => i !== currentGroupIdx)
      .map((g) => g.supplierName)
      .filter(Boolean);
    return inquirySuppliers.filter((s) => !selected.includes(s));
  };

  const updateGroup = (index: number, data: Partial<PurchaseGroup>) => {
    setGroups((prev) => {
      const newGroups = [...prev];
      newGroups[index] = { ...newGroups[index], ...data };
      return newGroups;
    });
  };

  const addGroup = () => {
    setGroups((prev) => {
      const idx = prev.length;
      const label = `采购合同${GROUP_LABELS[idx] || (idx + 1)}`;
      return [...prev, { label, supplierName: '', contractAmount: 0, deliveryPaymentTerms: '', supplyCycle: undefined, contractFile: '' }];
    });
  };

  const removeGroup = (index: number) => {
    setGroups((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = (gIdx: number, options: any) => {
    const formData = new FormData();
    formData.append('file', options.file as File);
    request
      .post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((res: any) => {
        const fileUrl = res.data?.url || res.url || '';
        updateGroup(gIdx, { contractFile: fileUrl });
        message.success('上传成功');
        options.onSuccess?.(res);
      })
      .catch((err: any) => {
        message.error('上传失败');
        options.onError?.(err);
      });
  };

  const totalAmount = groups.reduce((sum, g) => sum + (g.contractAmount || 0), 0);
  const selectedSuppliers = groups.map((g) => g.supplierName).filter(Boolean);

  const handleFinish = async () => {
    const inquiryId = form.getFieldValue('inquiryId');
    if (!inquiryId) {
      message.error('请选择询价单');
      return;
    }
    if (groups.length === 0) {
      message.error('请至少添加一个采购合同');
      return;
    }
    for (let i = 0; i < groups.length; i++) {
      if (!groups[i].supplierName) {
        message.error(`请选择${groups[i].label}的供货商`);
        return;
      }
      if (!groups[i].contractAmount || groups[i].contractAmount <= 0) {
        message.error(`请填写${groups[i].label}的合同金额`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        inquiryId,
        groups: groups.map((g) => ({
          supplierName: g.supplierName,
          contractAmount: g.contractAmount,
          deliveryPaymentTerms: g.deliveryPaymentTerms || undefined,
          supplyCycle: g.supplyCycle || undefined,
          contractFile: g.contractFile || undefined,
        })),
      };
      await purchaseConfirmsApi.create(payload);
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
    <Modal title="新建采购确认单" open={open} onCancel={onClose} onOk={handleFinish} confirmLoading={loading} width={800} destroyOnClose>
      <Form form={form} layout="vertical">
        <Form.Item name="inquiryId" label="询价单" rules={[{ required: true, message: '请选择询价单' }]}>
          <Select
            placeholder="选择已审批的询价单"
            onChange={handleInquirySelect}
            options={approvedInquiries.map((i: any) => ({ value: i.id, label: `${i.code} - ¥${Number(i.totalAmount).toLocaleString()}` }))}
          />
        </Form.Item>

        {groups.map((group, gIdx) => {
          const available = getAvailableSuppliers(gIdx);
          return (
            <Card
              key={gIdx}
              title={group.label}
              size="small"
              style={{ marginBottom: 12 }}
              extra={groups.length > 1 ? <Button type="link" danger icon={<DeleteOutlined />} onClick={() => removeGroup(gIdx)}>删除</Button> : null}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {group.supplierName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 500 }}>供货商：{group.supplierName}</span>
                    <Button size="small" onClick={() => updateGroup(gIdx, { supplierName: '' })}>更换</Button>
                  </div>
                ) : (
                  <Button onClick={() => setSupplierModalGroup(gIdx)} disabled={available.length === 0 && inquirySuppliers.length > 0 && selectedSuppliers.length >= inquirySuppliers.length}>
                    选择供货商
                    {inquirySuppliers.length > 0 && `（剩余 ${available.length} 家）`}
                  </Button>
                )}
                <InputNumber
                  placeholder="合同金额"
                  prefix="¥"
                  min={0}
                  style={{ width: 300 }}
                  value={group.contractAmount}
                  onChange={(v) => updateGroup(gIdx, { contractAmount: v || 0 })}
                />
                <Input.TextArea
                  rows={2}
                  placeholder="发货及付款条件"
                  value={group.deliveryPaymentTerms}
                  onChange={(e) => updateGroup(gIdx, { deliveryPaymentTerms: e.target.value })}
                />
                <Select
                  placeholder="选择供货周期"
                  allowClear
                  style={{ width: 300 }}
                  value={group.supplyCycle}
                  onChange={(v) => updateGroup(gIdx, { supplyCycle: v })}
                  options={SUPPLY_CYCLE_OPTIONS}
                />
                <Space>
                  <Input
                    placeholder="合同扫描件URL"
                    style={{ width: 300 }}
                    value={group.contractFile}
                    onChange={(e) => updateGroup(gIdx, { contractFile: e.target.value })}
                  />
                  <Upload
                    accept=".pdf,.jpg,.png,.doc,.docx"
                    maxCount={1}
                    showUploadList={false}
                    customRequest={(options) => handleUpload(gIdx, options)}
                  >
                    <Button icon={<UploadOutlined />}>上传</Button>
                  </Upload>
                </Space>
              </Space>
            </Card>
          );
        })}

        <Button type="dashed" icon={<PlusOutlined />} onClick={addGroup} block style={{ marginBottom: 16 }}>
          添加采购合同
        </Button>

        <Divider />
        <div style={{ textAlign: 'right' }}>
          <Statistic title="合同总金额" value={totalAmount} prefix="¥" precision={2} valueStyle={{ color: '#1890ff', fontWeight: 'bold', fontSize: 24 }} />
        </div>
      </Form>

      {/* Supplier Selection Modal */}
      <Modal
        title="选择供货商"
        open={supplierModalGroup !== null}
        onCancel={() => setSupplierModalGroup(null)}
        footer={null}
        width={400}
      >
        <List
          dataSource={supplierModalGroup !== null ? getAvailableSuppliers(supplierModalGroup) : []}
          renderItem={(supplier) => (
            <List.Item
              style={{ cursor: 'pointer' }}
              onClick={() => {
                if (supplierModalGroup !== null) {
                  updateGroup(supplierModalGroup, { supplierName: supplier });
                  setSupplierModalGroup(null);
                }
              }}
            >
              {supplier}
            </List.Item>
          )}
        />
      </Modal>
    </Modal>
  );
}
