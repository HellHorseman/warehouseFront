import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import UnitsPage from './pages/UnitsPage';
import ScanPage from './pages/ScanPage';
import InvoicesPage from './pages/InvoicesPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Защищенные маршруты */}
            <Route element={<ProtectedRoute />}>
                <Route path="/units" element={<UnitsPage />} />
                <Route path="/scan" element={<ScanPage />} />
                <Route path="/invoices" element={<InvoicesPage />} />
                <Route path="/" element={<Navigate to="/scan" replace />} />
            </Route>
        </Routes>
    );
}

export default App;