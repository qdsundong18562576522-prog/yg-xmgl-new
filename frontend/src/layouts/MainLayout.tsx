import { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button } from 'antd';
import {
  DashboardOutlined,
  ProjectOutlined,
  ShoppingCartOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  DollarOutlined,
  TeamOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  FormOutlined,
  FileSearchOutlined,
  CheckCircleOutlined,
  CarryOutOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '工作台' },
  { key: 'projects', icon: <ProjectOutlined />, label: '项目管理', children: [
      { key: '/projects', icon: <ProjectOutlined />, label: '项目立项' },
      { key: '/projects/variations', icon: <FormOutlined />, label: '工程量变更' },
    ] },
  {
    key: 'purchases', icon: <ShoppingCartOutlined />, label: '采购管理',
    children: [
      { key: '/purchases/requests', icon: <FormOutlined />, label: '采购申请' },
      { key: '/purchases/inquiries', icon: <FileSearchOutlined />, label: '采购询价' },
      { key: '/purchases/confirms', icon: <CheckCircleOutlined />, label: '采购确认' },
      { key: '/purchases/delivery', icon: <CarryOutOutlined />, label: '供货通知' },
    ],
  },
  { key: 'labor', icon: <FileTextOutlined />, label: '劳务管理', children: [
      { key: '/labor/contracts', icon: <CarryOutOutlined />, label: '劳务合同确认' },
      { key: '/labor/visas', icon: <FileSearchOutlined />, label: '劳务签证' },
    ] },
  { key: '/materials', icon: <DatabaseOutlined />, label: '材料设备库' },
  { key: 'inventory', icon: <DatabaseOutlined />, label: '库存管理', children: [
      { key: '/inventory/company', icon: <DatabaseOutlined />, label: '公司库存' },
      { key: '/inventory/project', icon: <DatabaseOutlined />, label: '项目库存' },
      { key: '/inventory/requisitions', icon: <SendOutlined />, label: '材料领用' },
      { key: '/inventory/stock-out', icon: <DatabaseOutlined />, label: '转库记录' },
    ] },
  { key: 'expenses', icon: <DollarOutlined />, label: '项目费用管理', children: [
      { key: '/expenses/requests', icon: <FormOutlined />, label: '费用申请' },
      { key: '/expenses/reimbursements', icon: <FileTextOutlined />, label: '费用报销' },
    ] },
    { key: '/finance', icon: <DollarOutlined />, label: '财务管理' },
  { key: '/users', icon: <TeamOutlined />, label: '用户管理' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
];

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const isAdmin = user?.role === 'admin';
  const visibleItems = menuItems.filter((item) => {
    if (!isAdmin && (item.key === '/users' || item.key === '/settings')) return false;
    return true;
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: `${user?.displayName} (${user?.role})` },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark">
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: collapsed ? 14 : 16 }}>
          {collapsed ? 'YG' : '扬光工程管理'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={visibleItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} />
          <Dropdown menu={userMenu} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.displayName}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
