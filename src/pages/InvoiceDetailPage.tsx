import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Space, Typography, message, Popconfirm, InputNumber, Modal, Select, Form, Collapse, Table, Checkbox, Input } from 'antd';
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
    creatorName?: string;
    shippedBy?: string;
    status: string;
    createdAt: string;
    items: InvoiceItem[];
}

interface Box {
    id: number;
    code: string;
    name?: string;
    status: string;
}

interface Unit { id: number; serialNumber: string; modelName: string; }
interface BulkItem { id: number; name: string; }

const statusColors: Record<string, string> = { draft: 'default', shipped: 'blue', partially_returned: 'orange', returned: 'green' };
const statusLabels: Record<string, string> = { draft: 'Черновик', shipped: 'Отгружена', partially_returned: 'Частичный возврат', returned: 'Возвращена' };

export default function InvoiceDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [boxes, setBoxes] = useState<Box[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [units, setUnits] = useState<Unit[]>([]);
    const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
    const [form] = Form.useForm();

    // Состояния для приёмки
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
    const [selectedUnits, setSelectedUnits] = useState<number[]>([]);
    const [scannedUnits, setScannedUnits] = useState<number[]>([]);
    const [bulkReturns, setBulkReturns] = useState<Record<number, number>>({});

    const fetchInvoice = async () => {
        try {
            const response = await api.get(`/invoices/${id}`);
            setInvoice(response.data);
        } catch (error) {
            message.error('Накладная не найдена');
            navigate('/invoices');
        }
    };

    const fetchBoxes = async () => {
        try {
            const response = await api.get('/boxes');
            setBoxes(response.data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchInvoice();
        fetchBoxes();
        Promise.all([api.get('/units?status=warehouse'), api.get('/bulk-items')])
            .then(([unitsRes, bulkRes]) => { setUnits(unitsRes.data); setBulkItems(bulkRes.data); })
            .catch(() => message.error('Ошибка загрузки справочников'));
    }, [id]);

    const handleShip = async () => {
        try {
            await api.post(`/invoices/${id}/ship`, {});
            message.success('Накладная отгружена!');
            fetchInvoice();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Ошибка отгрузки');
        }
    };

    // Открытие модалки приёмки
    const openReceiveModal = () => {
        if (!invoice) return;
        const available = invoice.items.filter(i => i.unitId && i.qtyReturned === 0).map(i => i.unitId as number);
        setSelectedUnits(available);
        setScannedUnits([]);

        // Инициализируем мелкое (по умолчанию 0)
        const initialBulk: Record<number, number> = {};
        invoice.items.filter(i => i.bulkItemId && i.qtyReturned < i.qtyShipped).forEach(i => {
            initialBulk[i.bulkItemId as number] = 0;
        });
        setBulkReturns(initialBulk);

        setIsReceiveModalOpen(true);
    };

    // Подтверждение приёмки
    const handleConfirmReceive = async () => {
        if (!invoice) return;
        try {
            await api.post(`/invoices/${id}/receive`, {
                unitIds: selectedUnits,
                scannedUnitIds: scannedUnits,
                bulkReturns: bulkReturns // Передаем количества
            });
            message.success('Приёмка выполнена!');
            setIsReceiveModalOpen(false);
            fetchInvoice();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Ошибка приёмки');
        }
    };

    // Сканирование в модалке
    const handleScanUnit = async (qrCode: string) => {
        if (!qrCode.trim() || !invoice) return;
        try {
            const response = await api.get(`/units/qr/${qrCode}`);
            const unitId = response.data.id;

            const isInInvoice = invoice.items.some(i => i.unitId === unitId && i.qtyReturned === 0);
            if (!isInInvoice) {
                message.warning('Это оборудование не относится к текущей накладной');
                return;
            }

            if (!scannedUnits.includes(unitId)) {
                setScannedUnits([...scannedUnits, unitId]);
                message.success(`Сканировано: ${response.data.modelName}`);
            }
        } catch (error) {
            message.error('Оборудование не найдено');
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
        if (values.unitId && invoice?.items.some(i => i.unitId === values.unitId)) {
            message.error('Это оборудование уже добавлено в накладную');
            return;
        }
        try {
            await api.post(`/invoices/${id}/items`, values);
            message.success('Позиция добавлена');
            setIsModalOpen(false);
            fetchInvoice();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Ошибка добавления');
        }
    };

    const handleAssignBox = async (itemId: number, boxId: number | null) => {
        try {
            await api.patch(`/invoices/${id}/items/${itemId}/box`, null, { params: { boxId } });
            fetchInvoice();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Ошибка привязки ящика');
        }
    };

    if (!invoice) return <div style={{ color: '#fff' }}>Загрузка...</div>;
    const isDraft = invoice.status === 'draft';

    // Группировка данных
    const unassignedItems = invoice.items.filter(i => !i.boxId);
    const itemsByBox = invoice.items.reduce((acc, item) => {
        if (item.boxId) {
            if (!acc[item.boxId]) acc[item.boxId] = [];
            acc[item.boxId].push(item);
        }
        return acc;
    }, {} as Record<number, InvoiceItem[]>);

    const boxOptions = boxes
        .filter(b => b.status === 'on_stock')
        .map(b => ({ value: b.id, label: `${b.code}${b.name ? ' - ' + b.name : ''}` }));

    const itemColumns = [
        { title: 'Наименование', render: (_: any, r: InvoiceItem) => r.unitName || r.bulkItemName || 'Неизвестно' },
        {
            title: 'Кол-во', dataIndex: 'qtyPlanned', width: 100,
            render: (qty: number, r: InvoiceItem) => {
                if (isDraft && r.bulkItemId) {
                    return <InputNumber min={1} defaultValue={qty} onBlur={(e) => { const val = parseInt(e.target.value); if (val && val !== qty) handleQtyChange(r.id, val); }} size="small" />;
                }
                return qty;
            }
        },
        ...(!isDraft ? [{
            title: 'Возвращено',
            width: 120,
            render: (_: any, r: InvoiceItem) => {
                if (r.bulkItemId) {
                    return <Tag color={r.qtyReturned >= r.qtyShipped ? 'green' : 'orange'}>{r.qtyReturned} / {r.qtyShipped}</Tag>;
                }
                return <Tag color={r.qtyReturned > 0 ? 'green' : 'default'}>{r.qtyReturned > 0 ? 'Принято' : 'Не принято'}</Tag>;
            }
        }] : []),
        ...(isDraft ? [
            {
                title: 'Ящик', width: 250,
                render: (_: any, r: InvoiceItem) => (
                    <Select
                        size="small"
                        style={{ width: '100%' }}
                        placeholder="Без ящика"
                        allowClear
                        value={r.boxId || undefined}
                        onChange={(val) => handleAssignBox(r.id, val || null)}
                        options={boxOptions}
                    />
                )
            },
            {
                title: '', width: 50,
                render: (_: any, r: InvoiceItem) => (
                    <Popconfirm title="Удалить?" onConfirm={() => handleDeleteItem(r.id)} okText="Да" cancelText="Нет">
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                )
            }
        ] : [])
    ];

    const collapseItems = [
        {
            key: 'unassigned',
            label: <span style={{ color: '#fff', fontWeight: 'bold' }}>Без ящика / Ожидают распределения ({unassignedItems.length})</span>,
            children: (
                <Table
                    dataSource={unassignedItems}
                    columns={itemColumns}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    style={{ background: '#1A1A1A' }}
                    locale={{ emptyText: <span style={{ color: '#888' }}>Все позиции распределены</span> }}
                />
            )
        },
        ...Object.entries(itemsByBox).map(([boxIdStr, items]) => {
            const boxId = Number(boxIdStr);
            const box = boxes.find(b => b.id === boxId);
            return {
                key: boxIdStr,
                label: <span style={{ color: '#fff', fontWeight: 'bold' }}>Ящик: {box ? `${box.code} ${box.name || ''}` : `ID ${boxId}`} ({items.length} поз.)</span>,
                children: (
                    <Table
                        dataSource={items}
                        columns={itemColumns}
                        rowKey="id"
                        pagination={false}
                        size="small"
                        style={{ background: '#1A1A1A' }}
                    />
                )
            };
        })
    ];

    // Получаем список позиций для приёмки (только невозвращенные QR)
    const receiveItems = invoice.items.filter(i => i.unitId && i.qtyReturned === 0);

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
                    <Descriptions.Item label="Составитель">{invoice.creatorName || invoice.responsible}</Descriptions.Item>
                    <Descriptions.Item label="Дата">{new Date(invoice.createdAt).toLocaleString('ru-RU')}</Descriptions.Item>
                    <Descriptions.Item label="Отгрузил">{invoice.shippedBy || '—'}</Descriptions.Item>
                </Descriptions>
            </Card>

            <Card title="Позиции" style={{ background: '#1A1A1A', border: 'none' }} extra={isDraft && <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>Добавить</Button>}>
                <Collapse items={collapseItems} style={{ background: '#111', borderColor: '#333' }} />
            </Card>

            <Space>
                {isDraft && <Popconfirm title="Отгрузить накладную?" onConfirm={handleShip} okText="Да" cancelText="Нет"><Button type="primary" size="large">Отгрузить со склада</Button></Popconfirm>}
                {(invoice.status === 'shipped' || invoice.status === 'partially_returned') && (
                    <Button type="primary" size="large" style={{ background: '#52c41a' }} onClick={openReceiveModal}>
                        Принять на склад
                    </Button>
                )}
            </Space>

            {/* Модалка добавления позиции */}
            <Modal title={<span style={{ color: '#fff' }}>Добавить позицию</span>} open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null} styles={{ header: { background: '#1A1A1A' }, content: { background: '#1A1A1A' }, body: { background: '#1A1A1A' } }}>
                <Form form={form} onFinish={handleAddItem} layout="vertical">
                    <Form.Item name="unitId" label={<span style={{ color: '#fff' }}>Оборудование с QR</span>}>
                        <Select allowClear placeholder="Выберите" options={units.filter(u => !invoice.items.some(i => i.unitId === u.id)).map(u => ({ value: u.id, label: `${u.modelName} (${u.serialNumber})` }))} />
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

            {/* Модалка приёмки */}
            <Modal
                title={<span style={{ color: '#fff' }}>Приёмка оборудования</span>}
                open={isReceiveModalOpen}
                onCancel={() => setIsReceiveModalOpen(false)}
                onOk={handleConfirmReceive}
                okText="Подтвердить"
                cancelText="Отмена"
                styles={{ header: { background: '#1A1A1A' }, content: { background: '#1A1A1A' }, body: { background: '#1A1A1A' } }}
            >
                <Typography.Text style={{ color: '#9CA3AF', display: 'block', marginBottom: 16 }}>
                    Отметьте галочками то, что вернулось. Сканируйте QR, если он есть.
                </Typography.Text>

                {/* Поле для сканирования */}
                <Input.Search
                    placeholder="Сканируйте QR или введите серийник"
                    enterButton="Сканировать"
                    onSearch={handleScanUnit}
                    style={{ marginBottom: 16 }}
                />

                <Checkbox.Group
                    style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                    value={selectedUnits}
                    onChange={(vals) => setSelectedUnits(vals as number[])}
                >
                    {receiveItems.map(item => (
                        <Checkbox key={item.unitId} value={item.unitId}>
                    <span style={{ color: '#fff' }}>
                        {item.unitName}
                        {scannedUnits.includes(item.unitId as number)
                            ? <Tag color="green" style={{ marginLeft: 8 }}>Считан</Tag>
                            : <Tag color="red" style={{ marginLeft: 8 }}>Без кода</Tag>
                        }
                    </span>
                        </Checkbox>
                    ))}
                </Checkbox.Group>

                {receiveItems.length === 0 && (
                    <Typography.Text style={{ color: '#888' }}>Все единицы с QR уже приняты.</Typography.Text>
                )}
                {invoice.items.filter(i => i.bulkItemId && i.qtyReturned < i.qtyShipped).length > 0 && (
                    <div style={{ marginTop: 24 }}>
                        <Typography.Title level={5} style={{ color: '#fff' }}>Мелкое оборудование (провода)</Typography.Title>
                        {invoice.items
                            .filter(i => i.bulkItemId && i.qtyReturned < i.qtyShipped)
                            .map(item => {
                                const maxReturn = item.qtyShipped - item.qtyReturned;
                                return (
                                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span style={{ color: '#fff' }}>{item.bulkItemName} (Отгружено: {maxReturn} шт.)</span>
                                        <InputNumber
                                            min={0}
                                            max={maxReturn}
                                            value={bulkReturns[item.bulkItemId as number] || 0}
                                            onChange={(val) => setBulkReturns({ ...bulkReturns, [item.bulkItemId as number]: val || 0 })}
                                            style={{ width: 100 }}
                                        />
                                    </div>
                                );
                            })
                        }
                    </div>
                )}
            </Modal>
        </Space>
    );
}