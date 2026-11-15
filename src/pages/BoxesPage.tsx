import { useEffect, useState } from 'react';
import { Table, Tag, Typography, Space, message, Button, Modal, Descriptions } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { api } from '../api/axios';

interface Box {
    id: number;
    code: string;
    type: string;
    status: string;
    maxCells: number | null;
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
            <Typography.Title level={3} style={{ margin: 0 }}>Ящики</Typography.Title>

            <Table columns={columns} dataSource={data} rowKey="id" loading={loading} style={{ background: '#1A1A1A' }} />

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
                        {selectedBox.units.length === 0 ? (
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
        </Space>
    );
}