import { useEffect, useState } from 'react';
import { Table, Tag, Typography, Button, Space, message, Modal, Form, Input, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../api/axios';

interface User {
    id: number;
    phone: string;
    fullName: string;
    role: string;
}

const roleLabels: Record<string, string> = {
    ADMIN: 'Администратор',
    MANAGER: 'Менеджер',
    STOREKEEPER: 'Кладовщик',
};

export default function UsersPage() {
    const [data, setData] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // Нужен эндпоинт GET /api/users (добавим на бэке)
            const response = await api.get('/users');
            setData(response.data);
        } catch (error) {
            message.error('Не удалось загрузить пользователей');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreate = async (values: any) => {
        try {
            await api.post('/users', values);
            message.success('Пользователь создан!');
            setIsModalOpen(false);
            form.resetFields();
            fetchUsers();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Ошибка создания');
        }
    };

    const columns: ColumnsType<User> = [
        { title: 'ID', dataIndex: 'id', width: 70 },
        { title: 'Телефон', dataIndex: 'phone' },
        { title: 'ФИО', dataIndex: 'fullName' },
        {
            title: 'Роль',
            dataIndex: 'role',
            render: (role: string) => (
                <Tag color={role === 'ADMIN' ? 'red' : role === 'MANAGER' ? 'blue' : 'green'}>
                    {roleLabels[role] || role}
                </Tag>
            ),
        },
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography.Title level={3} style={{ margin: 0 }}>Пользователи</Typography.Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
                    Добавить
                </Button>
            </div>

            <Table columns={columns} dataSource={data} rowKey="id" loading={loading} style={{ background: '#1A1A1A' }} />

            <Modal
                title={<span style={{ color: '#fff' }}>Создание пользователя</span>}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                styles={{ header: { background: '#1A1A1A' }, content: { background: '#1A1A1A' }, body: { background: '#1A1A1A' } }}
            >
                <Form form={form} layout="vertical" onFinish={handleCreate}>
                    <Form.Item name="phone" label={<span style={{ color: '#fff' }}>Телефон</span>} rules={[{ required: true }]}>
                        <Input placeholder="79000000001" />
                    </Form.Item>
                    <Form.Item name="fullName" label={<span style={{ color: '#fff' }}>ФИО</span>} rules={[{ required: true }]}>
                        <Input placeholder="Петров Петр" />
                    </Form.Item>
                    <Form.Item name="pin" label={<span style={{ color: '#fff' }}>PIN-код</span>} rules={[{ required: true }]}>
                        <Input.Password placeholder="1234" />
                    </Form.Item>
                    <Form.Item name="role" label={<span style={{ color: '#fff' }}>Роль</span>} rules={[{ required: true }]}>
                        <Select placeholder="Выберите роль">
                            <Select.Option value="ADMIN">Администратор</Select.Option>
                            <Select.Option value="MANAGER">Менеджер</Select.Option>
                            <Select.Option value="STOREKEEPER">Кладовщик</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block>Создать</Button>
                    </Form.Item>
                </Form>
            </Modal>
        </Space>
    );
}