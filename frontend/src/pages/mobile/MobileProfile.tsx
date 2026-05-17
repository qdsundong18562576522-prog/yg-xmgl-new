import { useState } from 'react';
import { Form, Input, Button, message, Modal } from 'antd';
import { UserOutlined, KeyOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import request from '../../api/request';

const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 10, padding: '14px 16px', marginBottom: 8,
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

export default function MobileProfile() {
  const { user, logout } = useAuthStore();
  const [pwdOpen, setPwdOpen] = useState(false);
  const [form] = Form.useForm();
  const [pwdLoading, setPwdLoading] = useState(false);

  const handleLogout = () => {
    Modal.confirm({
      title: '退出登录',
      content: '确定要退出登录吗？',
      onOk: () => { logout(); window.location.href = '/login'; },
    });
  };

  const handleChangePwd = async (values: any) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次密码不一致');
      return;
    }
    setPwdLoading(true);
    try {
      await request.post('/auth/change-password', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      message.success('密码修改成功');
      setPwdOpen(false);
      form.resetFields();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '修改失败');
    } finally {
      setPwdLoading(false);
    }
  };

  const roleLabels: Record<string, string> = {
    admin: '管理员', leader: '领导', pm: '项目经理',
    purchaser: '采购', finance: '财务', sales: '销售', engineer: '工程人员',
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a365d, #2563eb)',
        padding: '30px 16px 24px', color: '#fff', textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 32, background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, margin: '0 auto 12px',
        }}>
          <UserOutlined />
        </div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{user?.displayName}</div>
        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>
          {roleLabels[user?.role || ''] || user?.role} · {user?.department || ''}
        </div>
      </div>

      <div style={{ padding: '12px' }}>
        {/* Info Card */}
        <div style={cardStyle}>
          <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 14 }}>账户信息</div>
          <div style={{ fontSize: 13, lineHeight: 2, color: '#595959' }}>
            <div>用户名：{user?.username}</div>
            <div>角色：{roleLabels[user?.role || ''] || user?.role}</div>
            <div>部门：{user?.department || '-'}</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <div
            style={{
              flex: 1, ...cardStyle, textAlign: 'center', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            }}
            onClick={() => setPwdOpen(true)}
          >
            <KeyOutlined style={{ fontSize: 22, color: '#2563eb' }} />
            <span style={{ fontSize: 13 }}>修改密码</span>
          </div>
          <div
            style={{
              flex: 1, ...cardStyle, textAlign: 'center', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            }}
            onClick={handleLogout}
          >
            <LogoutOutlined style={{ fontSize: 22, color: '#ff4d4f' }} />
            <span style={{ fontSize: 13, color: '#ff4d4f' }}>退出登录</span>
          </div>
        </div>
      </div>

      <Modal
        title="修改密码"
        open={pwdOpen}
        onCancel={() => { setPwdOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={pwdLoading}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleChangePwd}>
          <Form.Item name="oldPassword" label="原密码" rules={[{ required: true, message: '请输入原密码' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="newPassword" label="新密码" rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码至少6位' },
          ]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="confirmPassword" label="确认密码" rules={[
            { required: true, message: '请确认密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                return Promise.reject(new Error('两次密码不一致'));
              },
            }),
          ]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
