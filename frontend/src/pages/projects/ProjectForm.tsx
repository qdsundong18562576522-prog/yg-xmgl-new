import { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, InputNumber, message } from 'antd';
import { projectsApi } from '../../api/projects';
import type { Project } from '../../api/projects';
import request from '../../api/request';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editProject?: Project | null;
}

const typeOptions = [
  { value: 'integration', label: '集成' },
  { value: 'supply', label: '供货' },
];

export default function ProjectForm({ open, onClose, onSuccess, editProject }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const isEdit = !!editProject;

  const salesOptions = allUsers
    .filter((u: any) => ['sales', 'admin'].includes(u.role))
    .map((u: any) => ({ value: u.id, label: `${u.displayName} (${u.department || ''})` }));

  const participantOptions = allUsers
    .map((u: any) => ({ value: u.id, label: `${u.displayName} (${u.department || ''})` }));

  const pmOptions = allUsers
    .filter((u: any) => ['pm', 'engineer', 'admin'].includes(u.role))
    .map((u: any) => ({ value: u.id, label: `${u.displayName}${u.department ? ` (${u.department})` : ''}` }));

  useEffect(() => {
    if (open) {
      request.get('/users').then((res: any) => {
        setAllUsers(res.data || []);
      });

      if (editProject) {
        // Extract member IDs from the members array
        const salesMemberIds = editProject.members
          ?.filter((m) => m.role === 'sales')
          .map((m) => m.userId) || [];
        const participantMemberIds = editProject.members
          ?.filter((m) => m.role === 'participant')
          .map((m) => m.userId) || [];

        form.setFieldsValue({
          ...editProject,
          salesMemberIds,
          participantMemberIds,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, editProject, form]);

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      const data: any = {
        name: values.name,
        type: values.type,
        description: values.description,
        contractAmount: values.contractAmount,
        expectedProfitRate: values.expectedProfitRate,
        projectManagerId: values.projectManagerId,
        planStartDate: values.planStartDate,
        planEndDate: values.planEndDate,
        remarks: values.remarks,
        salesMemberIds: values.salesMemberIds || [],
        participantMemberIds: values.participantMemberIds || [],
      };

      if (isEdit && editProject) {
        await projectsApi.update(editProject.id, data);
        message.success('项目更新成功');
      } else {
        await projectsApi.create(data);
        message.success('项目创建成功');
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
    <Modal
      title={isEdit ? '编辑项目' : '新建项目'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={640}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} preserve={false}>
        <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
          <Input placeholder="请输入项目名称" />
        </Form.Item>
        <Form.Item name="type" label="项目类型" rules={[{ required: true, message: '请选择项目类型' }]}>
          <Select options={typeOptions} placeholder="请选择项目类型" />
        </Form.Item>
        <Form.Item name="description" label="项目概况">
          <Input.TextArea rows={3} placeholder="请输入项目概况" />
        </Form.Item>

        {/* Sales Members - Multi Select */}
        <Form.Item name="salesMemberIds" label="销售负责人" rules={[{ required: true, message: '请至少选择一位销售负责人' }]}>
          <Select
            mode="multiple"
            showSearch
            placeholder="请选择销售负责人（可多选）"
            options={salesOptions}
            filterOption={(input, option) => (option?.label as string || '').includes(input)}
          />
        </Form.Item>

        <Form.Item name="projectManagerId" label="项目经理" rules={[{ required: true, message: '请选择项目经理' }]}>
          <Select
            showSearch
            placeholder="请选择项目经理"
            options={pmOptions}
            filterOption={(input, option) => (option?.label as string || '').includes(input)}
          />
        </Form.Item>

        {/* Participant Members - Multi Select */}
        <Form.Item name="participantMemberIds" label="参与人员">
          <Select
            mode="multiple"
            showSearch
            placeholder="请选择参与人员（可多选）"
            options={participantOptions}
            filterOption={(input, option) => (option?.label as string || '').includes(input)}
          />
        </Form.Item>

        <Form.Item name="contractAmount" label="合同金额 (元)" rules={[{ required: true, message: '请输入合同金额' }]}>
          <InputNumber style={{ width: '100%' }} min={0} prefix="¥" placeholder="请输入合同金额" />
        </Form.Item>
        <Form.Item name="expectedProfitRate" label="预期利润率 (%)">
          <InputNumber style={{ width: '100%' }} min={0} max={100} placeholder="请输入预期利润率" />
        </Form.Item>
        <Form.Item name="planStartDate" label="计划开工日期" rules={[{ required: true, message: '请选择开工日期' }]}>
          <Input type="date" />
        </Form.Item>
        <Form.Item name="planEndDate" label="计划完工日期" rules={[{ required: true, message: '请选择完工日期' }]}>
          <Input type="date" />
        </Form.Item>
        <Form.Item name="remarks" label="备注">
          <Input.TextArea rows={2} placeholder="请输入备注（回款信息、验收等）" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
