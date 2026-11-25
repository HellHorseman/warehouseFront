import { useEffect, useState } from 'react';
import {Table, Tag, Typography, Button, Space, message, Modal, Popconfirm} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {DeleteOutlined, PlusOutlined} from '@ant-design/icons';
import { api } from '../api/axios';
import CreateInvoiceForm from '../components/CreateInvoiceForm';
import { useNavigate } from 'react-router-dom';

interface Invoice {
    id: number;
    customer: string;
    responsible: string;
    status: string;
    createdAt: string;
}

const statusColors: Record<string, string> = {
    draft: 'default',
    shipped: 'blue',
    partially_returned: 'orange',
    returned: 'green',
};

const statusLabels: Record<string, string> = {
    draft: 'Черновик',
    shipped: 'Отгружена',
    partially_returned: 'Частичный возврат',
    returned: 'Возвращена',
};

export default function InvoicesPage() {
    const [data, setData] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const response = await api.get('/invoices');
            setData(response.data);
        } catch (error) {
            message.error('Не удалось загрузить накладные');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const handleDeleteInvoice = async (id: number) => {
        try {
            await api.delete(`/invoices/${id}`);
            message.success('Накладная удалена');
            fetchInvoices(); // Обновляем список
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Ошибка удаления');
        }
    };

    const columns: ColumnsType<Invoice> = [
        {
            title: '№',
            dataIndex: 'id',
            key: 'id',
            width: 70,
        },
        {
            title: 'Заказчик',
            dataIndex: 'customer',
            key: 'customer',
        },
        {
            title: 'Ответственный',
            dataIndex: 'responsible',
            key: 'responsible',
        },
        {
            title: 'Дата создания',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
        },
        {
            title: 'Статус',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={statusColors[status] || 'default'}>
                    {statusLabels[status] || status}
                </Tag>
            ),
        },
        {
            title: '',
            width: 60,
            render: (_, record) => {
                if (record.status === 'draft') {
                    return (
                        <div onClick={(e) => e.stopPropagation()}> {/* <-- ВОТ ЭТО */}
                            <Popconfirm
                                title="Удалить черновик?"
                                onConfirm={() => handleDeleteInvoice(record.id)}
                                okText="Да"
                                cancelText="Нет"
                            >
                                <Button type="text" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                        </div>
                    );
                }
                return null;
            }
        }
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography.Title level={3} style={{ margin: 0 }}>Накладные</Typography.Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
                    Создать накладную
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={data}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 15 }}
                style={{ background: '#1A1A1A' }}
                onRow={(record) => ({
                    onClick: () => navigate(`/invoices/${record.id}`),
                    style: { cursor: 'pointer' } // Меняем курсор на "руку"
                })}
            />

            <Modal
                title={<span style={{ color: '#fff' }}>Создание накладной</span>}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={800} // Пошире для формы
                styles={{
                    header: { background: '#1A1A1A' },
                    content: { background: '#1A1A1A' },
                    body: { background: '#1A1A1A' }
                }}
                destroyOnClose // Чтобы форма сбрасывалась при закрытии
            >
                <CreateInvoiceForm
                    onSuccess={() => {
                        setIsModalOpen(false);
                        fetchInvoices(); // Обновляем список накладных
                    }}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>
        </Space>
    );
}