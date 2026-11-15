import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tag, Button, Space, Typography, message, Popconfirm, InputNumber, Modal, Select } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { api } from '../api/axios';

interface InvoiceItem {
    id: number;
    unitId: number | null;
    unitName?: string;
    bulkItemId: number | null;
    bulkItemName?: string;
    qtyPlanned: number;
    qtyShipped: number;
    qtyReturned: number;
}

interface Invoice {
    id: number;
    customer: string;
    responsible: string;
    status: string;
    createdAt: string;
    items: InvoiceItem[];
}

interface Unit { id: number; serialNumber: string; modelName: string; }
interface BulkItem { id: number; name: string; }

const statusColors: Record<string, string> = {
    draft: 'default', shipped: 'blue', partially_returned: 'orange', returned: 'green',
};

const statusLabels: Record<string, string> = {
    draft: 'Черновик', shipped: 'Отгружена', partially_returned: 'Частичный возврат', returned: 'Возвращена',
};

export default function InvoiceDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(false);

    // Для добавления
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [units, setUnits] = useState<Unit[]>([]);
    const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);

    const fetchInvoice = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/invoices/${id}`);
            setInvoice(response.data);
        } catch (error) {
            message.error('Накладная не найдена');
            navigate('/invoices');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoice();
        // Загружаем справочники для добавления
        Promise.all([api.get('/units?status=warehouse'), api.get('/bulk-items')])
            .then(([unitsRes, bulkRes]) => {
                setUnits(unitsRes.data);
                setBulkItems(bulkRes.data);
            })
            .catch(() => message.error('Ошибка загрузки справочников'));
    }, [id]);

    const handleShip = async () => {
        try {
            await api.post(`/invoices/${id}/ship`, { shippedBy: 'Админ' });
            message.success('Накладная отгружена!');
            fetchInvoice();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Ошибка отгрузки');
        }
    };

    const handleReceive = async () => {
        if (!invoice) return;
        try {
            const unitIds = invoice.items.filter(i => i.unitId && i.qtyReturned === 0).map(i => i.unitId as number);
            await api.post(`/invoices/${id}/receive`, { unitIds });
            message.success('Оборудование принято на склад!');
            fetchInvoice();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Ошибка приёмки');
        }
    };

    // Удаление позиции
    const handleDeleteItem = async (itemId: number) => {
        try {
            await api.delete(`/invoices/${id}/items/${itemId}`);
            message.success('Позиция удалена');
            fetchInvoice();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Ошибка удаления');
        }
    };

    // Изменение количества (для мелких)
    const handleQtyChange = async (itemId: number, qty: number) => {
        try {
            await api.patch(`/invoices/${id}/items/${itemId}/qty?qty=${qty}`);
            fetchInvoice();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Ошибка изменения количества');
        }
    };

    // Добавление новой позиции
    const handleAddItem = async (values: any) => {
        try {
            await api.post(`/invoices/${id}/items`, values);
            message.success('Позиция добавлена');
            setIsModalOpen(false);
            fetchInvoice();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Ошибка добавления');
        }
    };

    if (!invoice) return <div style={{ color: '#fff' }}>Загрузка...</div>;

    const isDraft = invoice.status === 'draft';

    const columns = [
        { title: 'ID', dataIndex: 'id', width: 60 },
        {
            title: 'Наименование',
            render: (_: any, record: InvoiceItem) => record.unitName || record.bulkItemName || 'Неизвестно'
        },
        {
            title: 'План',
            dataIndex: 'qtyPlanned',
            width: 120,
            render: (qty: number, record: InvoiceItem) => {
                // Если черновик и это мелкое — можно менять
                if (isDraft && record.bulkItemId) {
                    return (
                        <InputNumber
                            min={1}
                            defaultValue={qty}
                            onBlur={(e) => {
                                const val = parseInt(e.target.value);
                                if (val && val !== qty) handleQtyChange(record.id, val);
                            }}
                            size="small"
                        />
                    );
                }
                return qty;
            }
        },
        { title: 'Отгружено', dataIndex: 'qtyShipped', width: 100 },
        { title: 'Возвращено', dataIndex: 'qtyReturned', width: 100 },
        ...(isDraft ? [{
            title: '',
            width: 60,
            render: (_: any, record: InvoiceItem) => (
                <Popconfirm title="Удалить позицию?" onConfirm={() => handleDeleteItem(record.id)} okText="Да" cancelText="Нет">
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            )
        }] : [])
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/invoices')} />
                <Typography.Title level={3} style={{ margin: 0 }}>
                    Накладная №{invoice.id}
                </Typography.Title>
                <Tag color={statusColors[invoice.status] || 'default'} style={{ marginLeft: 'auto', fontSize: 14, padding: '4px 8px' }}>
                    {statusLabels[invoice.status] || invoice.status}
                </Tag>
            </div>

            <Card title="Информация" style={{ background: '#1A1A1A', border: 'none' }}>
                <Descriptions column={2} labelStyle={{ color: '#9CA3AF' }} contentStyle={{ color: '#fff' }}>
                    <Descriptions.Item label="Заказчик">{invoice.customer}</Descriptions.Item>
                    <Descriptions.Item label="Ответственный">{invoice.responsible}</Descriptions.Item>
                    <Descriptions.Item label="Дата создания">{new Date(invoice.createdAt).toLocaleString('ru-RU')}</Descriptions.Item>
                </Descriptions>
            </Card>

            <Card
                title="Позиции"
                style={{ background: '#1A1A1A', border: 'none' }}
                extra={isDraft && <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>Добавить</Button>}
            >
                <Table dataSource={invoice.items} columns={columns as any} rowKey="id" pagination={false} size="small" />
            </Card>

            <Space>
                {isDraft && (
                    <Popconfirm title="Отгрузить накладную?" onConfirm={handleShip} okText="Да" cancelText="Нет">
                        <Button type="primary" size="large">Отгрузить со склада</Button>
                    </Popconfirm>
                )}
                {(invoice.status === 'shipped' || invoice.status === 'partially_returned') && (
                    <Popconfirm title="Принять накладную?" onConfirm={handleReceive} okText="Да" cancelText="Нет">
                        <Button type="primary" size="large" style={{ background: '#52c41a' }}>Принять на склад</Button>
                    </Popconfirm>
                )}
            </Space>

            {/* Модалка добавления позиции */}
            <Modal
                title={<span style={{ color: '#fff' }}>Добавить позицию</span>}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                styles={{ header: { background: '#1A1A1A' }, content: { background: '#1A1A1A' }, body: { background: '#1A1A1A' } }}
            >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Select
                        placeholder="Оборудование с QR"
                        style={{ width: '100%' }}
                        onChange={(val) => handleAddItem({ unitId: val, qtyPlanned: 1 })}
                        // ВОТ ЗДЕСЬ ФИЛЬТРУЕМ:
                        options={units
                            .filter(u => !invoice.items.some(item => item.unitId === u.id))
                            .map(u => ({ value: u.id, label: `${u.modelName} (${u.serialNumber})` }))
                        }
                    />
                    <Space.Compact style={{ width: '100%' }}>
                        <Select
                            placeholder="Мелкое (провода)"
                            style={{ width: '70%' }}
                            onChange={(val) => {
                                // Просто запоминаем в каком-то стейте, но для простоты вызовем с qty=1
                                handleAddItem({ bulkItemId: val, qtyPlanned: 1 });
                            }}
                            options={bulkItems.map(b => ({ value: b.id, label: b.name }))}
                        />
                    </Space.Compact>
                </Space>
            </Modal>
        </Space>
    );
}