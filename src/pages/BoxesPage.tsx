import { useEffect, useState } from 'react';
import { Table, Tag, Typography, Space, message, Button, Modal, Descriptions, Form, Input, InputNumber, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../api/axios';

interface Box {
    id: number;
    code: string;
    type: string;
    status: string;
    maxCells: number | null;
    qrCode: string;
}

interface Unit {
    id: number;
    serialNumber: string;
    modelName: string;
}

interface BoxDetail extends Box {
    units: Unit[];
}

const statusColors: Record<string, string> = {
    on_stock: 'green',
    in_transit: 'blue',
    at_client: 'orange',
};

const statusLabels: Record<string, string> = {
    on_stock: 'На складе',
    in_transit: 'В пути',
    at_client: 'У клиента',
};

const typeLabels: Record<string, string> = {
    BULK_CONTAINER: 'Ящик под мелочь',
    STATIC_KIT: 'Статический комплект',
    FIXED_BAG: 'Сумка (фикс.)',
    FIXED_BAG_OPTIONAL: 'Сумка (с добором)',
};

export default function BoxesPage() {
    const [data, setData] = useState<Box[]>([]);
    const [loading, setLoading] = useState(false);

    const [selectedBox, setSelectedBox] = useState<BoxDetail | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [form] = Form.useForm();

    const fetchBoxes = async () => {
        setLoading(true);
        try {
            const response = await api.get('/boxes');
            setData(response.data);
        } catch (error) {
            message.error('Ошибка загрузки ящиков');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBoxes();
    }, []);

    const handleOpenBox = async (id: number) => {
        try {
            const response = await api.get(`/boxes/${id}`);
            setSelectedBox(response.data);
            setIsModalOpen(true);
        } catch (error) {
            message.error('Не удалось открыть ящик');
        }
    };

    const handleReceiveBox = async () => {
        if (!selectedBox) return;
        try {
            await api.post(`/boxes/${selectedBox.id}/receive`);
            message.success('Ящик принят на склад!');
            setIsModalOpen(false);
            fetchBoxes();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Ошибка приёмки ящика');
        }
    };

    const handleCreateBox = async (values: any) => {
        try {
            await api.post('/boxes', values);
            message.success('Ящик создан!');
            setIsCreateModalOpen(false);
            form.resetFields();
            fetchBoxes();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Ошибка создания ящика');
        }
    };

    const columns: ColumnsType<Box> = [
        { title: 'ID', dataIndex: 'id', width: 70 },
        { title: 'Код', dataIndex: 'code' },
        {
            title: 'Тип',
            dataIndex: 'type',
            render: (type: string) => typeLabels[type] || type
        },
        {
            title: 'Статус',
            dataIndex: 'status',
            render: (status: string) => (
                <Tag color={statusColors[status] || 'default'}>
                    {statusLabels[status] || status}
                </Tag>
            ),
        },
        {
            title: '',
            render: (_, record) => (
                <Button size="small" onClick={() => handleOpenBox(record.id)}>Открыть</Button>
            )
        }
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography.Title level={3} style={{ margin: 0 }}>Ящики</Typography.Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalOpen(true)}>
                    Создать ящик
                </Button>
            </div>

            <Table columns={columns} dataSource={data} rowKey="id" loading={loading} style={{ background: '#1A1A1A' }} />

            {/* Модалка просмотра */}
            <Modal
                title={<span style={{ color: '#fff' }}>Ящик: {selectedBox?.code}</span>}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={[
                    selectedBox?.status === 'in_transit' && (
                        <Button key="receive" type="primary" onClick={handleReceiveBox}>
                            Принять ящик на склад
                        </Button>
                    ),
                    <Button key="close" onClick={() => setIsModalOpen(false)}>Закрыть</Button>
                ]}
                styles={{ header: { background: '#1A1A1A' }, content: { background: '#1A1A1A' }, body: { background: '#1A1A1A' } }}
            >
                {selectedBox && (
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Descriptions column={1} labelStyle={{ color: '#9CA3AF' }} contentStyle={{ color: '#fff' }}>
                            <Descriptions.Item label="Тип">{typeLabels[selectedBox.type] || selectedBox.type}</Descriptions.Item>
                            <Descriptions.Item label="Статус">{statusLabels[selectedBox.status] || selectedBox.status}</Descriptions.Item>
                            <Descriptions.Item label="Макс. ячеек">{selectedBox.maxCells || '—'}</Descriptions.Item>
                        </Descriptions>

                        <Typography.Title level={5} style={{ color: '#fff', marginTop: 16 }}>Содержимое:</Typography.Title>
                        {!selectedBox.units || selectedBox.units.length === 0 ? (
                            <Typography.Text style={{ color: '#888' }}>Пусто</Typography.Text>
                        ) : (
                            <Table
                                dataSource={selectedBox.units}
                                rowKey="id"
                                pagination={false}
                                size="small"
                                columns={[
                                    { title: 'Модель', dataIndex: 'modelName' },
                                    { title: 'Серийник', dataIndex: 'serialNumber' },
                                ]}
                            />
                        )}
                    </Space>
                )}
            </Modal>

            {/* Модалка создания */}
            <Modal
                title={<span style={{ color: '#fff' }}>Создание ящика</span>}
                open={isCreateModalOpen}
                onCancel={() => setIsCreateModalOpen(false)}
                footer={null}
                styles={{ header: { background: '#1A1A1A' }, content: { background: '#1A1A1A' }, body: { background: '#1A1A1A' } }}
            >
                <Form form={form} layout="vertical" onFinish={handleCreateBox}>
                    <Form.Item name="code" label={<span style={{ color: '#fff' }}>Код ящика</span>} rules={[{ required: true }]}>
                        <Input placeholder="BOX-001" />
                    </Form.Item>
                    <Form.Item name="qrCode" label={<span style={{ color: '#fff' }}>QR-код (оставь пустым для автогенерации)</span>}>
                        <Input placeholder="QR-BOX-001" />
                    </Form.Item>
                    <Form.Item name="type" label={<span style={{ color: '#fff' }}>Тип</span>} rules={[{ required: true }]}>
                        <Select placeholder="Выберите тип">
                            <Select.Option value="BULK_CONTAINER">Ящик под мелочь</Select.Option>
                            <Select.Option value="STATIC_KIT">Статический комплект</Select.Option>
                            <Select.Option value="FIXED_BAG">Сумка (фикс.)</Select.Option>
                            <Select.Option value="FIXED_BAG_OPTIONAL">Сумка (с добором)</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="maxCells" label={<span style={{ color: '#fff' }}>Макс. ячеек (только для сумок)</span>}>
                        <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block>Создать</Button>
                    </Form.Item>
                </Form>
            </Modal>
        </Space>
    );
}