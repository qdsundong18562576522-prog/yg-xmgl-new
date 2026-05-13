import { Tabs } from 'antd';
import { SettingOutlined, BookOutlined, FileTextOutlined, KeyOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import SettingsConfig from './SettingsConfig';
import SettingsDict from './SettingsDict';
import OperationLogs from './OperationLogs';
import ChangePassword from './ChangePassword';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const items = [
    ...(isAdmin ? [
      { key: 'config', label: '配置管理', icon: <SettingOutlined />, children: <SettingsConfig /> },
      { key: 'dict', label: '字典管理', icon: <BookOutlined />, children: <SettingsDict /> },
      { key: 'logs', label: '操作日志', icon: <FileTextOutlined />, children: <OperationLogs /> },
    ] : []),
    { key: 'password', label: '修改密码', icon: <KeyOutlined />, children: <ChangePassword /> },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>系统设置</h2>
      <Tabs items={items} />
    </div>
  );
}
