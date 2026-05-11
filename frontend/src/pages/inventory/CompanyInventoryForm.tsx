import { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, message } from 'antd';
import { companyInventoryApi } from '../../api/inventory';
import { materialsApi } from '../../api/materials';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: any;
}

export default function CompanyInventoryForm({ open, onClose, onSuccess, editData }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [materialOptions, setMaterialOptions] = useState<any[]>([]);
  const isEdit = !!editData;

  useEffect(() => {
    if (open) {
      materialsApi.findAll().then((res: any) => {
        setMaterialOptions(res.data || []);
      });
      if (editData) {
        form.setFieldsValue({
          materialLibId: editData.materialLibId || editData.materialLib?.id,
          quantity: Number(editData.quantity),
          costPrice: Number(editData.costPrice),
          remark: editData.remark,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, editData, form]);

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      if (isEdit) {
        await companyInventoryApi.update(editData.id, values);
        message.success('更新成功');
      } else {
        await companyInventoryApi.create(values);
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

  return (
    <Modal title={isEdit ? '编辑库存' : '新增库存'} open={open} onCancel={onClose} onOk={() => form.submit()} confirmLoading={loading} width={500} destroyOnClose>
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="materialLibId" label="材料" rules={[{ required: true }]}>
          <Select showSearch placeholder="选择材料" disabled={isEdit}
            options={materialOptions.map((m: any) => ({ value: m.id, label: `${m.name} / ${m.brand} / ${m.spec}` }))}
            filterOption={(input, option) => (option?.label as string || '').includes(input)}
          />
        </Form.Item>
        <Form.Item name="quantity" label="数量" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: '100%' }} placeholder="输入数量" />
        </Form.Item>
        <Form.Item name="costPrice" label="成本单价" rules={[{ required: true }]}>
          <InputNumber min={0} prefix="¥" style={{ width: '100%' }} placeholder="输入成本单价" />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
