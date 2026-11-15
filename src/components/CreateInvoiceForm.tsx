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

interface InvoiceItem {
    key: string;
    type: 'UNIT' | 'BULK';
    id: number; // ID юнита или мелкого
    name: string; // Для отображения
    qty: number;
}

interface Props {
    onSuccess: () => void; // Коллбэк, чтобы обновить список после создания
    onCancel: () => void;
}

export default function CreateInvoiceForm({ onSuccess, onCancel }: Props) {
    const [form] = Form.useForm();
    const [units, setUnits] = useState<Unit[]>([]);
    const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Загружаем доступное оборудование и мелкое при открытии
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [unitsRes, bulkRes] = await Promise.all([
                    api.get('/units', { params: { status: 'warehouse' } }),
                    api.get('/bulk-items'),
                ]);
                setUnits(unitsRes.data);
                setBulkItems(bulkRes.data);
            } catch (error) {
                message.error('Ошибка загрузки справочников');
            }
        };
        fetchData();
    }, []);

    const addUnit = (unitId: number) => {
        const unit = units.find((u) => u.id === unitId);
        if (!unit) return;

        // Проверяем, нет ли уже этого юнита в списке
        if (items.some((i) => i.type === 'UNIT' && i.id === unitId)) {
            message.warning('Это оборудование уже добавлено');
            return;
        }

        setItems([
            ...items,
            {
                key: `unit-${unitId}`,
                type: 'UNIT',
                id: unitId,
                name: `${unit.modelName} (${unit.serialNumber})`,
                qty: 1,
            },
        ]);
        form.resetFields(['unitSelect']);
    };

    const addBulkItem = (bulkId: number, qty: number) => {
        const bulk = bulkItems.find((b) => b.id === bulkId);
        if (!bulk || !qty) return;

        setItems([
            ...items,
            {
                key: `bulk-${Date.now()}`, // Уникальный ключ для строки
                type: 'BULK',
                id: bulkId,
                name: bulk.name,
                qty: qty,
            },
        ]);
        form.resetFields(['bulkSelect', 'bulkQty']);
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
                responsible: values.responsible,
                items: items.map((i) => ({
                    unitId: i.type === 'UNIT' ? i.id : null,
                    bulkItemId: i.type === 'BULK' ? i.id : null,
                    qtyPlanned: i.qty,
                })),
            };

            await api.post('/invoices', payload);
            message.success('Накладная создана!');
            onSuccess();
        } catch (error: any) {
            if (error.response?.data?.message) {
                message.error(error.response.data.message);
            } else {
                message.error('Ошибка создания накладной');
            }
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Тип',
            dataIndex: 'type',
            render: (type: string) => (type === 'UNIT' ? 'Серийное' : 'Мелкое'),
        },
        { title: 'Наименование', dataIndex: 'name' },
        { title: 'Кол-во', dataIndex: 'qty', width: 80 },
        {
            title: '',
            render: (_: any, record: InvoiceItem) => (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeItem(record.key)}
                />
            ),
            width: 50,
        },
    ];

    return (
        <div style={{ padding: '10px 0' }}>
            <Form form={form} layout="vertical">
                {/* Верхний блок с заказчиком и ответственным */}
                <div style={{ display: 'flex', gap: '16px' }}>
                    <Form.Item
                        name="customer"
                        label={<span style={{ color: '#fff' }}>Заказчик</span>}
                        rules={[{ required: true, message: 'Введите заказчика' }]}
                        style={{ flex: 1 }}
                    >
                        <Input placeholder="ООО Ромашка" />
                    </Form.Item>
                    <Form.Item
                        name="responsible"
                        label={<span style={{ color: '#fff' }}>Ответственный</span>}
                        rules={[{ required: true, message: 'Введите ответственного' }]}
                        style={{ flex: 1 }}
                    >
                        <Input placeholder="Иванов И.И." />
                    </Form.Item>
                </div>
            </Form>

            <Divider style={{ borderColor: '#333', margin: '12px 0' }} />

            {/* Блок добавления оборудования */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>

                {/* Добавление по QR */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ color: '#fff', width: '220px', display: 'inline-block' }}>Добавить оборудование с QR:</span>
                    <Select
                        showSearch
                        placeholder="Выберите единицу"
                        style={{ flex: 1 }}
                        onChange={(val) => {
                            addUnit(val);
                        }}
                        value={null} // Сбрасываем после выбора
                        optionFilterProp="children"
                        options={units.map((u) => ({
                            value: u.id,
                            label: `${u.modelName} (${u.serialNumber})`,
                        }))}
                    />
                </div>

                {/* Добавление мелкого */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ color: '#fff', width: '220px', display: 'inline-block' }}>Добавить мелкое (провода):</span>
                    <Space.Compact style={{ flex: 1 }}>
                        <Select
                            placeholder="Выберите"
                            style={{ width: '60%' }}
                            onChange={(val) => form.setFieldValue('bulkSelect', val)}
                            options={bulkItems.map((b) => ({ value: b.id, label: b.name }))}
                        />
                        <InputNumber
                            min={1}
                            placeholder="Кол-во"
                            style={{ width: '25%' }}
                            onChange={(val) => form.setFieldValue('bulkQty', val)}
                        />
                        <Button
                            type="primary"
                            style={{ width: '15%' }}
                            onClick={() => {
                                const bulkId = form.getFieldValue('bulkSelect');
                                const qty = form.getFieldValue('bulkQty');
                                if (bulkId && qty) addBulkItem(bulkId, qty);
                            }}
                        >
                            +
                        </Button>
                    </Space.Compact>
                </div>
            </div>

            {/* Таблица с добавленными позициями */}
            <Table
                dataSource={items}
                columns={columns as any}
                pagination={false}
                size="small"
                style={{ marginTop: 16, background: '#1A1A1A' }}
                locale={{ emptyText: <span style={{ color: '#888' }}>Добавьте позиции</span> }}
            />

            {/* Кнопки снизу */}
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <Button onClick={onCancel}>Отмена</Button>
                <Button type="primary" onClick={handleSubmit} loading={loading}>
                    Создать накладную
                </Button>
            </div>
        </div>
    );
}