import { useEffect, useState } from 'react';
import { Card, Typography, Button, Space, message, Tag, Input } from 'antd';
import { Html5QrcodeScanner } from 'html5-qrcode';
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

export default function ScanPage() {
    const [unit, setUnit] = useState<Unit | null>(null);
    const [loading, setLoading] = useState(false);
    const [manualCode, setManualCode] = useState('');

    // Инициализация сканера при монтировании
    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
        );

        scanner.render(
            (decodedText) => {
                scanner.clear(); // Останавливаем сканер после успешного скана
                handleScan(decodedText);
            },
            (error) => {
                // Ошибки сканирования игнорируем, чтобы не засорять консоль
            }
        );

        return () => {
            scanner.clear().catch((e) => console.error("Ошибка очистки сканера", e));
        };
    }, []);

    const handleScan = async (code: string) => {
        setLoading(true);
        try {
            const response = await api.get(`/units/qr/${code}`);
            setUnit(response.data);
        } catch (error: any) {
            if (error.response?.status === 404) {
                message.error('Оборудование с таким QR не найдено');
            } else {
                message.error('Ошибка при поиске оборудования');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleManualSubmit = () => {
        if (manualCode.trim()) {
            handleScan(manualCode.trim());
            setManualCode('');
        }
    };

    const changeStatus = async (newStatus: string) => {
        if (!unit) return;
        try {
            await api.patch(`/units/${unit.id}/status`, { status: newStatus });
            message.success('Статус обновлен');
            setUnit({ ...unit, status: newStatus });
        } catch (error) {
            message.error('Не удалось обновить статус');
        }
    };

    return (
        <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Typography.Title level={3} style={{ margin: 0 }}>Сканер QR</Typography.Title>

                {/* Блок сканера */}
                <Card title="Наведите камеру на QR-код">
                    <div id="reader" style={{ width: '100%' }}></div>
                </Card>

                {/* Ручной ввод (для сканера-пистолета или если камера не работает) */}
                <Card title="Или введите код вручную">
                    <Space.Compact style={{ width: '100%' }}>
                        <Input
                            placeholder="Введите серийный номер или QR-код"
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            onPressEnter={handleManualSubmit}
                        />
                        <Button type="primary" onClick={handleManualSubmit} loading={loading}>
                            Найти
                        </Button>
                    </Space.Compact>
                </Card>

                {/* Карточка найденного оборудования */}
                {unit && (
                    <Card title="Найдено оборудование" style={{ borderLeft: '4px solid #1E5EFF' }}>
                        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                            <div><strong>Модель:</strong> {unit.modelName}</div>
                            <div><strong>Серийный номер:</strong> {unit.serialNumber}</div>
                            <div>
                                <strong>Текущий статус: </strong>
                                <Tag color={statusColors[unit.status] || 'default'}>
                                    {statusLabels[unit.status] || unit.status}
                                </Tag>
                            </div>
                            <div>
                                <Typography.Text type="secondary">Сменить статус:</Typography.Text>
                                <div style={{ marginTop: 8 }}>
                                    <Space wrap>
                                        <Button size="small" onClick={() => changeStatus('warehouse')}>На склад</Button>
                                        <Button size="small" type="primary" onClick={() => changeStatus('client')}>В аренду</Button>
                                        <Button size="small" danger onClick={() => changeStatus('service')}>В ремонт</Button>
                                    </Space>
                                </div>
                            </div>
                        </Space>
                    </Card>
                )}
            </Space>
        </div>
    );
}