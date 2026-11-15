import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tag, Button, Space, Typography, message, Popconfirm, InputNumber, Modal, Select, Form } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { api } from '../api/axios';

interface InvoiceItem {
    id: number;
    unitId: number | null;
    unitName?: string;
    bulkItemId: number | null;
    bulkItemName?: string;
    boxId: number | null;
    boxName?: string;
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

const statusColors: Record<string, string> = { draft: 'default', shipped: 'blue', partially_returned: 'orange', returned: 'green' };
const statusLabels: Record<string, string> = { draft: 'Черновик', shipped: 'Отгружена', partially_returned: 'Частичный возврат', returned: 'Возвращена' };

export default function InvoiceDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState<Invoice | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [units, setUnits] = useState<Unit[]>([]);
    const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
    const [form] = Form.useForm();

    const fetchInvoice = async () => {
        try {
            const response = await api.get(`/invoices/${id}`);
            setInvoice(response.data);
        } catch (error) {
            message.error('Накладная не найдена');
            navigate('/invoices');
        }
    };

    useEffect(() => {
        fetchInvoice();
        Promise.all([api.get('/units?status=warehouse'), api.get('/bulk-items')])
            .then(([unitsRes, bulkRes]) => { setUnits(unitsRes.data); setBulkItems(bulkRes.data); })
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

    const handleDeleteItem = async (itemId: number) => {
        try {
            await api.delete(`/invoices/${id}/items/${itemId}`);
            message.success('Позиция удалена');
            fetchInvoice();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Ошибка удаления');
        }
    };

    const handleQtyChange = async (itemId: number, qty: number) => {
        try {
            await api.patch(`/invoices/${id}/items/${itemId}/qty?qty=${qty}`);
            fetchInvoice();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Ошибка изменения количества');
        }
    };

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
        { title: 'Наименование', render: (_: any, r: InvoiceItem) => r.unitName || r.bulkItemName || 'Неизвестно' },
        { title: 'Ящик', dataIndex: 'boxName', width: 150, render: (val: string) => val || '—' },
        {
            title: 'План', dataIndex: 'qtyPlanned', width: 120,
            render: (qty: number, r: InvoiceItem) => {
                if (isDraft && r.bulkItemId) {
                    return <InputNumber min={1} defaultValue={qty} onBlur={(e) => { const val = parseInt(e.target.value); if (val && val !== qty) handleQtyChange(r.id, val); }} size="small" />;
                }
                return qty;
            }
        },
        { title: 'Отгружено', dataIndex: 'qtyShipped', width: 100 },
        { title: 'Возвращено', dataIndex: 'qtyReturned', width: 100 },
        ...(isDraft ? [{ title: '', width: 60, render: (_: any, r: InvoiceItem) => (
                <Popconfirm title="Удалить?" onConfirm={() => handleDeleteItem(r.id)} okText="Да" cancelText="Нет">
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            )}] : [])
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/invoices')} />
                <Typography.Title level={3} style={{ margin: 0 }}>Накладная №{invoice.id}</Typography.Title>
                <Tag color={statusColors[invoice.status] || 'default'} style={{ marginLeft: 'auto', fontSize: 14, padding: '4px 8px' }}>
                    {statusLabels[invoice.status] || invoice.status}
                </Tag>
            </div>

            <Card title="Информация" style={{ background: '#1A1A1A', border: 'none' }}>
                <Descriptions column={2} styles={{ label: { color: '#9CA3AF' }, content: { color: '#fff' } }}>
                    <Descriptions.Item label="Заказчик">{invoice.customer}</Descriptions.Item>
                    <Descriptions.Item label="Ответственный">{invoice.responsible}</Descriptions.Item>
                    <Descriptions.Item label="Дата">{new Date(invoice.createdAt).toLocaleString('ru-RU')}</Descriptions.Item>
                </Descriptions>
            </Card>

            <Card title="Позиции" style={{ background: '#1A1A1A', border: 'none' }} extra={isDraft && <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>Добавить</Button>}>
                <Table dataSource={invoice.items} columns={columns as any} rowKey="id" pagination={false} size="small" />
            </Card>

            <Space>
                {isDraft && <Popconfirm title="Отгрузить?" onConfirm={handleShip} okText="Да" cancelText="Нет"><Button type="primary" size="large">Отгрузить со склада</Button></Popconfirm>}
                {(invoice.status === 'shipped' || invoice.status === 'partially_returned') && (
                    <Popconfirm title="Принять?" onConfirm={handleReceive} okText="Да" cancelText="Нет"><Button type="primary" size="large" style={{ background: '#52c41a' }}>Принять на склад</Button></Popconfirm>
                )}
            </Space>

            <Modal title={<span style={{ color: '#fff' }}>Добавить позицию</span>} open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null} styles={{ header: { background: '#1A1A1A' }, content: { background: '#1A1A1A' }, body: { background: '#1A1A1A' } }}>
                <Form form={form} onFinish={handleAddItem} layout="vertical">
                    <Form.Item name="unitId" label={<span style={{ color: '#fff' }}>Оборудование с QR</span>}>
                        <Select allowClear placeholder="Выберите" options={units.map(u => ({ value: u.id, label: `${u.modelName} (${u.serialNumber})` }))} />
                    </Form.Item>
                    <Form.Item name="bulkItemId" label={<span style={{ color: '#fff' }}>Мелкое</span>}>
                        <Select allowClear placeholder="Выберите" options={bulkItems.map(b => ({ value: b.id, label: b.name }))} />
                    </Form.Item>
                    <Form.Item name="qtyPlanned" label={<span style={{ color: '#fff' }}>Кол-во</span>} initialValue={1}>
                        <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block>Добавить</Button>
                </Form>
            </Modal>
        </Space>
    );
}