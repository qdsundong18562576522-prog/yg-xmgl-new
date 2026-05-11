import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import zhCN from 'antd/locale/zh_CN';
import LoginPage from './pages/login';
import MainLayout from './layouts/MainLayout';
import DashboardPage from './pages/dashboard';
import UsersPage from './pages/users';
import ProjectsPage from './pages/projects';
import MaterialsPage from './pages/materials';
import PurchaseRequestsPage from './pages/purchases/PurchaseRequests';
import InquiryOrdersPage from './pages/purchases/InquiryOrders';
import PurchaseConfirmsPage from './pages/purchases/PurchaseConfirms';
import DeliveryNoticesPage from './pages/purchases/DeliveryNotices';
import CompanyInventoryPage from './pages/inventory/CompanyInventory';
import ProjectInventoryPage from './pages/inventory/ProjectInventory';
import MaterialRequisitionsPage from './pages/inventory/MaterialRequisitions';
import { useAuthStore } from './stores/authStore';

const queryClient = new QueryClient();

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  return isAuth() ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={zhCN}>
        <AntApp>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
                <Route index element={<DashboardPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="materials" element={<MaterialsPage />} />
                <Route path="purchases/requests" element={<PurchaseRequestsPage />} />
                <Route path="purchases/inquiries" element={<InquiryOrdersPage />} />
                <Route path="purchases/confirms" element={<PurchaseConfirmsPage />} />
                <Route path="purchases/delivery" element={<DeliveryNoticesPage />} />
                <Route path="inventory/company" element={<CompanyInventoryPage />} />
                <Route path="inventory/project" element={<ProjectInventoryPage />} />
                <Route path="inventory/requisitions" element={<MaterialRequisitionsPage />} />
                <Route path="users" element={<AdminRoute><UsersPage /></AdminRoute>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
