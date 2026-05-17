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
import StockOutRecordsPage from './pages/inventory/StockOutRecords';
import ExpenseRequestsPage from './pages/expenses/ExpenseRequests';
import ReimbursementsPage from './pages/expenses/Reimbursements';
import ContractVariationsPage from './pages/expenses/ContractVariations';
import LaborContractsPage from './pages/labor/LaborContracts';
import LaborVisasPage from './pages/labor/LaborVisas';
import ProjectLedgerPage from './pages/projects/ProjectLedger';
import ProjectLedgerListPage from './pages/projects/ProjectLedgerList';
import SettingsPage from './pages/settings';
import PaymentRequestsPage from './pages/finance/PaymentRequests';
import ProjectReceivablesPage from './pages/finance/ProjectReceivables';
import MobileLayout from './pages/mobile/MobileLayout';
import MobileDashboard from './pages/mobile/MobileDashboard';
import MobileApprovals from './pages/mobile/MobileApprovals';
import MobileNotifications from './pages/mobile/MobileNotifications';
import MobileProfile from './pages/mobile/MobileProfile';
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
                <Route path="inventory/stock-out" element={<StockOutRecordsPage />} />
                <Route path="expenses/requests" element={<ExpenseRequestsPage />} />
                <Route path="expenses/reimbursements" element={<ReimbursementsPage />} />
                <Route path="projects/variations" element={<ContractVariationsPage />} />
                <Route path="projects/ledger" element={<ProjectLedgerListPage />} />
                <Route path="projects/ledger/:id" element={<ProjectLedgerPage />} />
                <Route path="labor/contracts" element={<LaborContractsPage />} />
                <Route path="labor/visas" element={<LaborVisasPage />} />
                <Route path="finance/payment-requests" element={<PaymentRequestsPage />} />
                <Route path="finance/receivables" element={<ProjectReceivablesPage />} />
                <Route path="users" element={<AdminRoute><UsersPage /></AdminRoute>} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="/m" element={<PrivateRoute><MobileLayout /></PrivateRoute>}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<MobileDashboard />} />
                <Route path="approvals" element={<MobileApprovals />} />
                <Route path="notifications" element={<MobileNotifications />} />
                <Route path="profile" element={<MobileProfile />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
