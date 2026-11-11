import { Layout, Menu, Button, Typography, Space } from 'antd';
import {
    ScanOutlined,
    DatabaseOutlined,
    FileTextOutlined,
    LogoutOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const { Header, Content, Sider } = Layout;

export default function MainLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const logout = useAuthStore((state) => state.logout);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { key: '/scan', icon: <ScanOutlined />, label: 'Сканер' },
        { key: '/units', icon: <DatabaseOutlined />, label: 'Оборудование' },
        { key: '/invoices', icon: <FileTextOutlined />, label: 'Накладные' },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider breakpoint="lg" collapsedWidth="0">
                <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                    Склад
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    onClick={({ key }) => navigate(key)}
                    style={{
                        borderRight: 'none',
                        background: '#000000',
                        padding: '0 12px'
                    }}
                />
            </Sider>
            <Layout>
                <Header style={{ background: '#111', padding: '0 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Space>
                        <Typography.Text style={{ color: '#fff' }}>Администратор</Typography.Text>
                        <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} style={{ color: '#fff' }}>
                            Выйти
                        </Button>
                    </Space>
                </Header>
                <Content style={{
                    margin: 24,
                    padding: 24,
                    background: 'transparent',
                    borderRadius: 8,
                    minHeight: 280,
                }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
}