import { useEffect, useState } from 'react';
import {Table, Tag, Input, Select, Space, Typography, message, Tabs, Button} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined } from '@ant-design/icons';
import { api } from '../api/axios';

interface Unit {
    id: number;
    serialNumber: string;
    qrCode: string;
    status: string;
    modelName: string;
}

interface BulkItem {
    id: number;
    name: string;
    qtyOnHand: number;
}

const statusColors: Record<string, string> = {
    warehouse: 'green',
    client: 'blue',
    service: 'orange',
    written_off: 'default',
};

const statusLabels: Record<string, string> = {
    warehouse: 'На складе',
    client: 'В аренде',
    service: 'В ремонте',
    written_off: 'Списан',
};

export default function UnitsPage() {
    const [units, setUnits] = useState<Unit[]>([]);
    const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
    const [modelFilter, setModelFilter] = useState<string>('');

    const fetchUnits = async () => {
        setLoading(true);
        try {
            const response = await api.get('/units', {
                params: { status: statusFilter, modelName: modelFilter || undefined },
            });
            setUnits(response.data);
        } catch (error) {
            message.error('Не удалось загрузить список оборудования');
        } finally {
            setLoading(false);
        }
    };

    const fetchBulkItems = async () => {
        try {
            const response = await api.get('/bulk-items');
            setBulkItems(response.data);
        } catch (error) {
            message.error('Не удалось загрузить мелкое оборудование');
        }
    };

    useEffect(() => {
        fetchUnits();
    }, [statusFilter]);

    useEffect(() => {
        fetchBulkItems();
    }, []);

    const handlePrintQr = async (id: number, code: string, sizeInMm?: number) => {
        const token = JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.token;
        if (!token) return;

        // Если размер не передан, используем 55мм (стандарт)
        const targetSize = sizeInMm || 55;
        // Переводим мм в пиксели для генерации (примерно 4 пикселя на мм)
        const pxSize = targetSize * 4;

        try {
            const response = await fetch(`http://localhost:8080/api/units/${id}/qr?width=${pxSize}&height=${pxSize}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);

            const printWindow = window.open('', '_blank');
            if (!printWindow) return;

            // Формируем HTML с размерами в мм для CSS
            printWindow.document.write(`
            <html>
                <head>
                    <title>Печать QR: ${code}</title>
                    <style>
                        @page { margin: 0; } /* Убираем поля для термопринтера */
                        body { text-align: center; font-family: sans-serif; margin: 0; padding: 5mm; }
                        .qr-container { 
                            width: ${targetSize}mm; 
                            height: ${targetSize}mm; 
                            margin: 0 auto;
                        }
                        .qr-container img { width: 100%; height: 100%; }
                        .label { font-size: ${targetSize > 40 ? '14px' : '10px'}; margin-top: 2mm; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="qr-container">
                        <img src="${imageUrl}" />
                    </div>
                    <div class="label">${code}</div>
                    <script>
                        const img = document.querySelector('img');
                        img.onload = () => { window.print(); window.close(); };
                    </script>
                </body>
            </html>
        `);
            printWindow.document.close();
        } catch (error) {
            message.error('Ошибка печати');
        }
    };

    // Колонки для серийного оборудования
    const unitColumns: ColumnsType<Unit> = [
        { title: 'ID', dataIndex: 'id', width: 70 },
        { title: 'Модель', dataIndex: 'modelName' },
        { title: 'Серийный номер', dataIndex: 'serialNumber' },
        { title: 'QR-код', dataIndex: 'qrCode' },
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
            title: 'QR',
            width: 120,
            render: (_, record) => (
                <Space>
                    <Button size="small" onClick={() => handlePrintQr(record.id, record.serialNumber, 55)}>
                        Стандарт
                    </Button>
                    <Button size="small" onClick={() => handlePrintQr(record.id, record.serialNumber, 30)}>
                        3x1.5
                    </Button>
                </Space>
            )
        }
    ];

    // Колонки для мелкого оборудования
    const bulkColumns: ColumnsType<BulkItem> = [
        { title: 'ID', dataIndex: 'id', width: 70 },
        { title: 'Наименование', dataIndex: 'name' },
        {
            title: 'Остаток на складе',
            dataIndex: 'qtyOnHand',
            render: (qty: number) => <strong>{qty} шт.</strong>
        },
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Typography.Title level={3} style={{ margin: 0 }}>Оборудование</Typography.Title>

            <Tabs
                defaultActiveKey="1"
                items={[
                    {
                        key: '1',
                        label: 'Серийное (с QR)',
                        children: (
                            <>
                                <Space wrap style={{ marginBottom: 16 }}>
                                    <Input
                                        placeholder="Поиск по модели"
                                        prefix={<SearchOutlined />}
                                        value={modelFilter}
                                        onChange={(e) => setModelFilter(e.target.value)}
                                        onPressEnter={fetchUnits}
                                        style={{ width: 250 }}
                                    />
                                    <Select
                                        placeholder="Статус"
                                        allowClear
                                        style={{ width: 150 }}
                                        value={statusFilter}
                                        onChange={(value) => setStatusFilter(value)}
                                        options={[
                                            { value: 'warehouse', label: 'На складе' },
                                            { value: 'client', label: 'В аренде' },
                                            { value: 'service', label: 'В ремонте' },
                                            { value: 'written_off', label: 'Списан' },
                                        ]}
                                    />
                                </Space>
                                <Table
                                    columns={unitColumns}
                                    dataSource={units}
                                    rowKey="id"
                                    loading={loading}
                                    pagination={{ pageSize: 20 }}
                                    style={{ background: '#1A1A1A' }}
                                />
                            </>
                        ),
                    },
                    {
                        key: '2',
                        label: 'Мелкое (без QR)',
                        children: (
                            <Table
                                columns={bulkColumns}
                                dataSource={bulkItems}
                                rowKey="id"
                                pagination={{ pageSize: 20 }}
                                style={{ background: '#1A1A1A' }}
                            />
                        ),
                    },
                ]}
            />
        </Space>
    );
}