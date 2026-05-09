import { useState, useEffect, useRef } from 'react';
import { Modal, Form, Input, Select, InputNumber, Button, Table, message, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, DownloadOutlined, UploadOutlined, FileTextOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { purchaseRequestsApi } from '../../api/purchases';
import request from '../../api/request';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: any;
}

export default function PurchaseRequestForm({ open, onClose, onSuccess, editData }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = !!editData;

  useEffect(() => {
    if (open) {
      request.get('/projects').then((res: any) => setProjects(res.data || []));
      if (editData) {
        form.setFieldsValue({
          projectId: editData.projectId,
          deliveryAddress: editData.deliveryAddress,
          receiver: editData.receiver || '',
          phone: editData.phone,
          requiredDeliveryDate: editData.requiredDeliveryDate,
          remark: editData.remark,
          items: (editData.items || []).map((item: any) => ({
            name: item.name, brand: item.brand, spec: item.spec, unit: item.unit,
            quantity: item.quantity, contractPrice: item.contractPrice,
          })),
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, editData, form]);

  // Export items as Excel
  const handleExport = () => {
    const items: any[] = form.getFieldValue('items') || [];
    if (items.length === 0) {
      message.warning('请先添加采购明细');
      return;
    }
    const data = items.map((item: any, i: number) => ({
      '序号': i + 1,
      '材料名称': item.name || '',
      '品牌': item.brand || '',
      '规格型号': item.spec || '',
      '单位': item.unit || '',
      '数量': item.quantity || 0,
      '合同单价': item.contractPrice || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '采购明细');
    ws['!cols'] = [{ wch: 6 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 12 }];
    XLSX.writeFile(wb, '采购明细.xlsx');
    message.success('导出成功');
  };

  // Download template
  const handleDownloadTemplate = () => {
    const data = [{ '材料名称': '', '品牌': '', '规格型号': '', '单位': '', '数量': 0, '合同单价': 0 }];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '采购明细');
    ws['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 12 }];
    XLSX.writeFile(wb, '采购明细模板.xlsx');
    message.success('模板已下载');
  };

  // Import items from Excel
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        const items = rows.map((row: any) => ({
          name: String(row['材料名称'] || row['name'] || ''),
          brand: String(row['品牌'] || row['brand'] || ''),
          spec: String(row['规格型号'] || row['spec'] || ''),
          unit: String(row['单位'] || row['unit'] || ''),
          quantity: Number(row['数量'] || row['quantity'] || 0),
          contractPrice: Number(row['合同单价'] || row['contractPrice'] || 0),
        })).filter((item) => item.name);

        if (items.length === 0) {
          message.warning('未读取到有效数据');
          return;
        }
        form.setFieldsValue({ items });
        message.success(`成功导入 ${items.length} 条材料`);
      } catch {
        message.error('导入失败，请检查文件格式');
      }
    };
    reader.readAsBinaryString(file);
    // Reset input so same file can be re-imported
    e.target.value = '';
  };

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      const items = (values.items || []).map((item: any) => ({
        name: item.name, brand: item.brand || '', spec: item.spec || '', unit: item.unit || '',
        quantity: item.quantity, contractPrice: item.contractPrice,
      }));
      const payload = { ...values, items, requiredDeliveryDate: values.requiredDeliveryDate || null, remark: values.remark || null };
      delete payload.receiverId;
      if (isEdit && editData) {
        await purchaseRequestsApi.update(editData.id, payload);
        message.success('更新成功');
      } else {
        await purchaseRequestsApi.create(payload);
        message.success('创建成功');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={isEdit ? '编辑采购申请' : '新建采购申请'} open={open} onCancel={onClose} onOk={() => form.submit()} confirmLoading={loading} width={900} destroyOnClose>
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="projectId" label="项目" rules={[{ required: true }]}>
          <Select placeholder="选择项目" options={projects.map((p: any) => ({ value: p.id, label: `${p.name} (${p.code})` }))} />
        </Form.Item>
        <Form.Item label="采购明细" required>
          <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
            <Button icon={<DownloadOutlined />} size="small" onClick={handleExport}>导出</Button>
            <Button icon={<UploadOutlined />} size="small" onClick={() => fileRef.current?.click()}>导入</Button>
            <Button icon={<FileTextOutlined />} size="small" onClick={handleDownloadTemplate}>下载模板</Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleImport} />
            <span style={{ fontSize: 12, color: '#999', marginLeft: 8, lineHeight: '24px' }}>支持 .xlsx / .xls / .csv 格式</span>
          </div>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                <Table
                  dataSource={fields.map((f) => ({ ...f }))}
                  rowKey="key"
                  pagination={false}
                  columns={[
                    { title: '材料名称', width: 160, render: (_: any, __: any, index: number) => (
                      <Form.Item name={[index, 'name']} rules={[{ required: true, message: '必填' }]} style={{ margin: 0 }}>
                        <Input placeholder="输入材料名称" />
                      </Form.Item>
                    )},
                    { title: '品牌', width: 100, render: (_: any, __: any, index: number) => (
                      <Form.Item name={[index, 'brand']} style={{ margin: 0 }}>
                        <Input placeholder="品牌" />
                      </Form.Item>
                    )},
                    { title: '规格型号', width: 120, render: (_: any, __: any, index: number) => (
                      <Form.Item name={[index, 'spec']} style={{ margin: 0 }}>
                        <Input placeholder="规格" />
                      </Form.Item>
                    )},
                    { title: '单位', width: 60, render: (_: any, __: any, index: number) => (
                      <Form.Item name={[index, 'unit']} style={{ margin: 0 }}>
                        <Input placeholder="单位" />
                      </Form.Item>
                    )},
                    { title: '数量', width: 100, render: (_: any, __: any, index: number) => (
                      <Form.Item name={[index, 'quantity']} rules={[{ required: true, message: '必填' }]} style={{ margin: 0 }}>
                        <InputNumber min={0} style={{ width: '100%' }} placeholder="数量" />
                      </Form.Item>
                    )},
                    { title: '合同单价', width: 130, render: (_: any, __: any, index: number) => (
                      <Form.Item name={[index, 'contractPrice']} rules={[{ required: true, message: '必填' }]} style={{ margin: 0 }}>
                        <InputNumber min={0} style={{ width: '100%' }} prefix="¥" placeholder="单价" />
                      </Form.Item>
                    )},
                    { title: '操作', width: 60, render: (_: any, __: any, index: number) => (
                      <Button type="link" danger icon={<DeleteOutlined />} onClick={() => remove(index)} />
                    )},
                  ]}
                />
                <Button type="dashed" onClick={() => add({})} icon={<PlusOutlined />} block style={{ marginTop: 8 }}>添加一行</Button>
              </>
            )}
          </Form.List>
        </Form.Item>
        <Form.Item name="requiredDeliveryDate" label="要求到货时间">
          <Input type="date" />
        </Form.Item>
        <Form.Item name="deliveryAddress" label="到货地址">
          <Input />
        </Form.Item>
        <Form.Item name="receiver" label="收货人">
          <Input placeholder="输入收货人姓名" />
        </Form.Item>
        <Form.Item name="phone" label="电话">
          <Input />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={2} placeholder="采购备注" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
