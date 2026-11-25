import { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Table, InputNumber, Space, message, Divider } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { api } from '../api/axios';

interface Unit {
    id: number;
    serialNumber: string;
    modelName: string;
}

interface BulkItem {
    id: number;
    name: string;
}

interface Box {
    id: number;
    code: string;
    status: string;
    name?: string;
}

interface InvoiceItem {
    key: string;
    type: 'UNIT' | 'BULK';
    id: number;
    name: string;
    qty: number;
    boxId?: number | null;
    boxName?: string | null;
}

interface Props {
    onSuccess: () => void;
    onCancel: () => void;
}

export default function CreateInvoiceForm({ onSuccess, onCancel }: Props) {
    const [form] = Form.useForm();
    const [units, setUnits] = useState<Unit[]>([]);
    const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
    const [boxes, setBoxes] = useState<Box[]>([]);
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [unitsRes, bulkRes, boxesRes] = await Promise.all([
                    api.get('/units', { params: { status: 'warehouse' } }),
                    api.get('/bulk-items'),
                    api.get('/boxes'),
                ]);
                setUnits(unitsRes.data);
                setBulkItems(bulkRes.data);
                setBoxes(boxesRes.data);
            } catch (error) {
                message.error('Ошибка загрузки справочников');
            }
        };
        fetchData();
    }, []);

    const addUnit = (unitId: number) => {
        const unit = units.find((u) => u.id === unitId);
        if (!unit) return;

        if (items.some((i) => i.type === 'UNIT' && i.id === unitId)) {
            message.warning('Это оборудование уже добавлено');
            return;
        }

        const currentBoxId = form.getFieldValue('currentBoxId');
        const currentBox = boxes.find(b => b.id === currentBoxId);

        setItems([
            ...items,
            {
                key: `unit-${unitId}`,
                type: 'UNIT',
                id: unitId,
                name: `${unit.modelName} (${unit.serialNumber})`,
                qty: 1,
                boxId: currentBoxId || null,
                boxName: currentBox ? `${currentBox.code}${currentBox.name ? ' - ' + currentBox.name : ''}` : null,
            },
        ]);
        form.setFieldValue('unitSelect', undefined);
    };

    const addBulkItem = (bulkId: number, qty: number) => {
        const bulk = bulkItems.find((b) => b.id === bulkId);
        if (!bulk || !qty) return;

        const currentBoxId = form.getFieldValue('currentBoxId');
        const currentBox = boxes.find(b => b.id === currentBoxId);

        setItems([
            ...items,
            {
                key: `bulk-${Date.now()}`,
                type: 'BULK',
                id: bulkId,
                name: bulk.name,
                qty: qty,
                boxId: currentBoxId || null,
                boxName: currentBox ? `${currentBox.code}${currentBox.name ? ' - ' + currentBox.name : ''}` : null,
            },
        ]);
        form.setFieldsValue({ bulkSelect: undefined, bulkQty: undefined });
    };

    const removeItem = (key: string) => {
        setItems(items.filter((i) => i.key !== key));
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            if (items.length === 0) {
                message.error('Добавьте хотя бы одну позицию');
                return;
            }

            setLoading(true);
            const payload = {
                customer: values.customer,
                items: items.map((i) => ({
                    unitId: i.type === 'UNIT' ? i.id : null,
                    bulkItemId: i.type === 'BULK' ? i.id : null,
                    boxId: i.boxId || null,
                    qtyPlanned: i.qty,
                })),
            };

            await api.post('/invoices', payload);
            message.success('Накладная создана!');
            onSuccess();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Ошибка создания накладной');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { title: 'Тип', dataIndex: 'type', render: (t: string) => (t === 'UNIT' ? 'QR' : 'Мелкое') },
        { title: 'Наименование', dataIndex: 'name' },
        { title: 'Кол-во', dataIndex: 'qty', width: 80 },
        {
            title: 'Ящик',
            dataIndex: 'boxName',
            render: (val: string | null) => val || '—'
        },
        {
            title: '',
            width: 50,
            render: (_: any, record: InvoiceItem) => (
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeItem(record.key)} />
            ),
        },
    ];

    return (
        <div style={{ padding: '10px 0' }}>
            <Form form={form} layout="vertical">
                <div style={{ display: 'flex', gap: '16px' }}>
                    <Form.Item name="customer" label={<span style={{ color: '#fff' }}>Заказчик</span>} rules={[{ required: true }]} style={{ flex: 1 }}>
                        <Input placeholder="ООО Ромашка" />
                    </Form.Item>
                </div>

                <Divider style={{ borderColor: '#333', margin: '12px 0' }} />

                <Form.Item name="currentBoxId" label={<span style={{ color: '#fff' }}>В какой ящик кладем? (необязательно)</span>}>
                    <Select
                        allowClear
                        placeholder="Без ящика (само по себе)"
                        options={boxes.map((b) => ({ value: b.id, label: `${b.code}${b.name ? ' - ' + b.name : ''}` }))}
                        style={{ width: '100%', marginBottom: 16 }}
                    />
                </Form.Item>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ color: '#fff', width: '220px' }}>Добавить оборудование с QR:</span>
                        <Form.Item name="unitSelect" noStyle>
                            <Select
                                showSearch
                                placeholder="Выберите единицу"
                                style={{ flex: 1 }}
                                onChange={(val) => addUnit(val)}
                                value={null}
                                optionFilterProp="children"
                                options={units
                                    .filter(u => !items.some(item => item.id === u.id && item.type === 'UNIT'))
                                    .map((u) => ({ value: u.id, label: `${u.modelName} (${u.serialNumber})` }))}
                            />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ color: '#fff', width: '220px' }}>Добавить мелкое (провода):</span>
                        <Space.Compact style={{ flex: 1 }}>
                            <Form.Item name="bulkSelect" noStyle>
                                <Select placeholder="Выберите" style={{ width: '60%' }} options={bulkItems.map((b) => ({ value: b.id, label: b.name }))} />
                            </Form.Item>
                            <Form.Item name="bulkQty" noStyle>
                                <InputNumber min={1} placeholder="Кол-во" style={{ width: '25%' }} />
                            </Form.Item>
                            <Button type="primary" style={{ width: '15%' }} onClick={() => {
                                const bulkId = form.getFieldValue('bulkSelect');
                                const qty = form.getFieldValue('bulkQty');
                                if (bulkId && qty) addBulkItem(bulkId, qty);
                            }}>+</Button>
                        </Space.Compact>
                    </div>
                </div>
            </Form>

            <Table
                dataSource={items}
                columns={columns as any}
                pagination={false}
                size="small"
                style={{ marginTop: 16, background: '#1A1A1A' }}
                locale={{ emptyText: <span style={{ color: '#888' }}>Добавьте позиции</span> }}
            />

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <Button onClick={onCancel}>Отмена</Button>
                <Button type="primary" onClick={handleSubmit} loading={loading}>Создать накладную</Button>
            </div>
        </div>
    );
}