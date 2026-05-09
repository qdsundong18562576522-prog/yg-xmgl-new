import { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, message } from 'antd';
import { deliveryNoticesApi, purchaseConfirmsApi } from '../../api/purchases';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeliveryNoticeForm({ open, onClose, onSuccess }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [approvedConfirms, setApprovedConfirms] = useState<any[]>([]);
  const [transportMethod, setTransportMethod] = useState<string>();

  useEffect(() => {
    if (open) {
      Promise.all([purchaseConfirmsApi.findAll(), deliveryNoticesApi.findAll()]).then(([confirmsRes, noticesRes]: any) => {
        const usedIds = new Set((noticesRes.data || []).map((n: any) => n.confirmId));
        setApprovedConfirms((confirmsRes.data || []).filter((c: any) => c.status === 'approved' && !usedIds.has(c.id)));
      });
      form.resetFields();
      setTransportMethod(undefined);
    }
  }, [open, form]);

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      await deliveryNoticesApi.create(values);
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
    <Modal title="新建供货通知单" open={open} onCancel={onClose} onOk={() => form.submit()} confirmLoading={loading} width={600} destroyOnClose>
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="confirmId" label="采购确认单" rules={[{ required: true }]}>
          <Select placeholder="选择已审批的采购确认单" options={approvedConfirms.map((c: any) => ({ value: c.id, label: `${c.code} - ¥${Number(c.totalAmount).toLocaleString()}` }))} />
        </Form.Item>
        <Form.Item name="receiver" label="收货人">
          <Input />
        </Form.Item>
        <Form.Item name="phone" label="电话">
          <Input />
        </Form.Item>
        <Form.Item name="address" label="收货地址">
          <Input />
        </Form.Item>
        <Form.Item name="totalDate" label="最晚到货日期">
          <Input type="date" />
        </Form.Item>
        <Form.Item name="deliveryOption" label="到货方式">
          <Select placeholder="选择到货方式" options={[
            { value: '一次性', label: '一次性' },
            { value: '分批次', label: '分批次' },
          ]} allowClear />
        </Form.Item>
        <Form.Item name="transportMethod" label="运输方式">
          <Select placeholder="选择运输方式" onChange={(val) => setTransportMethod(val)} allowClear>
            <Select.Option value="陆运">陆运</Select.Option>
            <Select.Option value="空运">空运</Select.Option>
            <Select.Option value="送货上门">送货上门</Select.Option>
            <Select.Option value="自提">自提</Select.Option>
          </Select>
        </Form.Item>
        {(transportMethod === '陆运' || transportMethod === '空运') && (
          <Form.Item name="trackingNumber" label="单号" rules={[{ required: true, message: '请输入运单号' }]}>
            <Input placeholder="请输入运单号" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
