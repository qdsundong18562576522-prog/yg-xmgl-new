import { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, message, Upload, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { purchaseConfirmsApi, inquiryOrdersApi } from '../../api/purchases';
import request from '../../api/request';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PurchaseConfirmForm({ open, onClose, onSuccess }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [approvedInquiries, setApprovedInquiries] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      inquiryOrdersApi.findAll().then((res: any) => {
        setApprovedInquiries((res.data || []).filter((i: any) => i.status === 'approved'));
      });
      form.resetFields();
    }
  }, [open, form]);

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      await purchaseConfirmsApi.create(values);
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
    <Modal title="新建采购确认单" open={open} onCancel={onClose} onOk={() => form.submit()} confirmLoading={loading} width={600} destroyOnClose>
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="inquiryId" label="询价单" rules={[{ required: true }]}>
          <Select placeholder="选择已审批的询价单" options={approvedInquiries.map((i: any) => ({ value: i.id, label: `${i.code} - ¥${Number(i.totalAmount).toLocaleString()}` }))} />
        </Form.Item>
        <Form.Item name="deliveryPaymentTerms" label="发货及付款条件">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="supplyCycle" label="供货周期">
          <Input placeholder="如：30天" />
        </Form.Item>
        <Form.Item name="contractFile" label="合同附件">
          <Input placeholder="合同扫描件路径或URL" style={{ marginBottom: 8 }} />
          <Upload
            accept=".pdf,.jpg,.png,.doc,.docx"
            maxCount={1}
            showUploadList={false}
            customRequest={async (options) => {
              try {
                const formData = new FormData();
                formData.append('file', options.file as File);
                const res: any = await request.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                const fileUrl = res.data?.url || res.url || '';
                form.setFieldsValue({ contractFile: fileUrl });
                message.success('上传成功');
                options.onSuccess?.(res);
              } catch (err: any) {
                message.error('上传失败');
                options.onError?.(err);
              }
            }}
          >
            <Button icon={<UploadOutlined />}>选择文件上传</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
}
