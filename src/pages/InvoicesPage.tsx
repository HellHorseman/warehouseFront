import { useEffect, useState } from 'react';
import { Table, Tag, Typography, Button, Space, message, Modal } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../api/axios';

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
            />

            <Modal
                title="Создание накладной"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                styles={{ body: { background: '#1A1A1A' }, header: { background: '#1A1A1A', color: '#fff' } }}
            >
                <Typography.Text style={{ color: '#fff' }}>
                    Здесь скоро будет форма создания накладной (выбор оборудования, ящиков и т.д.)
                </Typography.Text>
            </Modal>
        </Space>
    );
}