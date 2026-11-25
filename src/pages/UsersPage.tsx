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
    active: boolean;
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
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
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

    // Универсальная функция для создания и редактирования
    const handleSave = async (values: any) => {
        try {
            if (editingUser) {
                // Обновление
                await api.put(`/users/${editingUser.id}`, values);
                message.success('Пользователь обновлен');
            } else {
                // Создание
                await api.post('/users', values);
                message.success('Пользователь создан');
            }
            setIsModalOpen(false);
            form.resetFields();
            setEditingUser(null);
            fetchUsers();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Ошибка сохранения');
        }
    };

    // Функция открытия модалки для создания
    const openCreateModal = () => {
        setEditingUser(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    // Функция открытия модалки для редактирования
    const openEditModal = (user: User) => {
        setEditingUser(user);
        form.setFieldsValue({
            phone: user.phone,
            fullName: user.fullName,
            role: user.role,
            active: user.active,
        });
        setIsModalOpen(true);
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
        {
            title: 'Статус',
            dataIndex: 'active',
            render: (active: boolean) => (
                <Tag color={active ? 'green' : 'default'}>
                    {active ? 'Активен' : 'Уволен'}
                </Tag>
            ),
        },
        {
            title: '',
            width: 80,
            render: (_, record) => (
                <Button size="small" onClick={() => openEditModal(record)}>
                    Ред.
                </Button>
            ),
        },
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography.Title level={3} style={{ margin: 0 }}>Пользователи</Typography.Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                    Добавить
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={data}
                rowKey="id"
                loading={loading}
                style={{ background: '#1A1A1A' }}
            />

            <Modal
                title={<span style={{ color: '#fff' }}>{editingUser ? 'Редактирование' : 'Создание'} пользователя</span>}
                open={isModalOpen}
                onCancel={() => { setIsModalOpen(false); setEditingUser(null); form.resetFields(); }}
                footer={null}
                styles={{
                    header: { background: '#1A1A1A' },
                    content: { background: '#1A1A1A' },
                    body: { background: '#1A1A1A' }
                }}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSave}
                >
                    <Form.Item
                        name="phone"
                        label={<span style={{ color: '#fff' }}>Телефон</span>}
                        rules={[{ required: true, message: 'Введите телефон' }]}
                    >
                        <Input placeholder="79000000001" disabled={!!editingUser} />
                    </Form.Item>

                    <Form.Item
                        name="fullName"
                        label={<span style={{ color: '#fff' }}>ФИО</span>}
                        rules={[{ required: true, message: 'Введите ФИО' }]}
                    >
                        <Input placeholder="Петров Петр" />
                    </Form.Item>

                    <Form.Item
                        name="pin"
                        label={<span style={{ color: '#fff' }}>PIN-код {editingUser && '(оставьте пустым, чтобы не менять)'}</span>}
                        rules={[{ required: !editingUser, message: 'Введите PIN' }]}
                    >
                        <Input.Password placeholder="1234" />
                    </Form.Item>

                    <Form.Item
                        name="role"
                        label={<span style={{ color: '#fff' }}>Роль</span>}
                        rules={[{ required: true, message: 'Выберите роль' }]}
                    >
                        <Select placeholder="Выберите роль">
                            <Select.Option value="ADMIN">Администратор</Select.Option>
                            <Select.Option value="MANAGER">Менеджер</Select.Option>
                            <Select.Option value="STOREKEEPER">Кладовщик</Select.Option>
                        </Select>
                    </Form.Item>

                    {editingUser && (
                        <Form.Item
                            name="active"
                            label={<span style={{ color: '#fff' }}>Активен</span>}
                        >
                            <Select>
                                <Select.Option value={true}>Да</Select.Option>
                                <Select.Option value={false}>Нет (уволен)</Select.Option>
                            </Select>
                        </Form.Item>
                    )}

                    <Form.Item>
                        <Button type="primary" htmlType="submit" block>Сохранить</Button>
                    </Form.Item>
                </Form>
            </Modal>
        </Space>
    );
}