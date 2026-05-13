import { useState } from 'react';
import { Card, Form, Input, Button, message } from 'antd';
import request from '../../api/request';

export default function ChangePassword() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    try {
      await request.post('/auth/change-password', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      message.success('密码修改成功');
      form.resetFields();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="修改密码" style={{ maxWidth: 500 }}>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="oldPassword" label="原密码" rules={[{ required: true, message: '请输入原密码' }]}>
          <Input.Password />
        </Form.Item>
        <Form.Item name="newPassword" label="新密码" rules={[
          { required: true, message: '请输入新密码' },
          { min: 6, message: '密码至少6位' },
        ]}>
          <Input.Password />
        </Form.Item>
        <Form.Item name="confirmPassword" label="确认新密码" dependencies={['newPassword']} rules={[
          { required: true, message: '请确认新密码' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
              return Promise.reject(new Error('两次输入的密码不一致'));
            },
          }),
        ]}>
          <Input.Password />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>确认修改</Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
