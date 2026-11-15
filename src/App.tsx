import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import UnitsPage from './pages/UnitsPage';
import ScanPage from './pages/ScanPage';
import InvoicesPage from './pages/InvoicesPage';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import UsersPage from './pages/UsersPage';
import BoxesPage from './pages/BoxesPage';

function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                    <Route path="/units" element={<UnitsPage />} />
                    <Route path="/scan" element={<ScanPage />} />
                    <Route path="/invoices" element={<InvoicesPage />} />
                    <Route path="/" element={<Navigate to="/scan" replace />} />
                    <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/boxes" element={<BoxesPage />} />
                </Route>
            </Route>
        </Routes>
    );
}

export default App;