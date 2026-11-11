import { useEffect, useState } from 'react';
import { Table, Tag, Input, Select, Space, Typography, message } from 'antd';
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
    const [data, setData] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
    const [modelFilter, setModelFilter] = useState<string>('');

    const fetchUnits = async () => {
        setLoading(true);
        try {
            const response = await api.get('/units', {
                params: {
                    status: statusFilter,
                    modelName: modelFilter || undefined,
                },
            });
            setData(response.data);
        } catch (error) {
            message.error('Не удалось загрузить список оборудования');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUnits();
    }, [statusFilter]); // Перезапрашиваем при смене статуса

    const columns: ColumnsType<Unit> = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 70,
        },
        {
            title: 'Модель',
            dataIndex: 'modelName',
            key: 'modelName',
        },
        {
            title: 'Серийный номер',
            dataIndex: 'serialNumber',
            key: 'serialNumber',
        },
        {
            title: 'QR-код',
            dataIndex: 'qrCode',
            key: 'qrCode',
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
            <Typography.Title level={3} style={{ margin: 0 }}>Оборудование</Typography.Title>

            <Space wrap>
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
                columns={columns}
                dataSource={data}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 20 }}
                style={{ background: '#1A1A1A' }}
            />
        </Space>
    );
}