import { useEffect, useState, useRef } from 'react';
import { Card, Typography, Button, Space, message, Tag, Input, Select } from 'antd';
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

    const [invoices, setInvoices] = useState<any[]>([]);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

    // Используем useRef, чтобы сканер не перезапускался при каждом рендере
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    // Загрузка накладных (один раз при монтировании)
    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                const res = await api.get('/invoices');
                const available = res.data.filter((i: any) =>
                    i.status === 'draft' || i.status === 'shipped' || i.status === 'partially_returned'
                );
                setInvoices(available);
            } catch (e) {
                console.error('Ошибка загрузки накладных', e);
                message.error('Не удалось загрузить накладные');
            }
        };
        fetchInvoices();
    }, []);

    // Инициализация сканера
    useEffect(() => {
        const timer = setTimeout(() => {
            const readerElement = document.getElementById("reader");
            if (!readerElement) return;

            // На всякий случай очищаем, но теперь React не должен сюда лезть
            readerElement.innerHTML = "";

            const scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                false
            );

            scanner.render(
                (decodedText) => {
                    // Безопасная остановка
                    if (scannerRef.current) {
                        scannerRef.current.clear().catch(e => console.warn("Clear error", e));
                    }
                    handleScan(decodedText);
                },
                () => { /* ignore */ }
            );

            scannerRef.current = scanner;
        }, 100);

        return () => {
            clearTimeout(timer);
            // Безопасная очистка при размонтировании
            if (scannerRef.current) {
                scannerRef.current.clear().catch(e => console.warn("Unmount clear error", e));
                scannerRef.current = null;
            }
        };
    }, []);// Зависимостей нет, чтобы не перезапускать

    const handleScan = async (code: string) => {
        setLoading(true);
        try {
            if (selectedInvoiceId) {
                // Ищем в рамках накладной
                const res = await api.get(`/invoices/${selectedInvoiceId}/scan?qrCode=${code}`);
                message.success(`Найдено в накладной: ${res.data.unitName || res.data.serialNumber}`);
                // Можно установить unit из res.data, если бэкенд отдает полные данные
            } else {
                // Обычный поиск
                const response = await api.get(`/units/qr/${code}`);
                setUnit(response.data);
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Ошибка сканирования');
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
                <Card title="Выберите накладную (опционально)">
                    <Select
                        allowClear
                        placeholder="Без накладной (просто поиск)"
                        style={{ width: '100%' }}
                        onChange={(val) => setSelectedInvoiceId(val || null)}
                        options={invoices.map(i => ({
                            value: i.id,
                            label: `№${i.id} (${i.status === 'draft' ? 'Черновик' : 'Отгружена'}) - ${i.customer}`
                        }))}
                    />
                </Card>

                <Card title="Наведите камеру на QR-код">
                    {/* Текст-заглушка, который React контролирует */}
                    <Typography.Text style={{ color: '#888', display: 'block', marginBottom: 8 }}>
                        Загрузка камеры...
                    </Typography.Text>

                    {/* Пустой контейнер, которым полностью владеет html5-qrcode */}
                    <div
                        id="reader"
                        style={{
                            width: '100%',
                            minHeight: '300px',
                            background: '#000'
                        }}
                    />
                </Card>

                {/* Ручной ввод */}
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