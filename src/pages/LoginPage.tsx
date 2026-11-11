import { useState } from 'react';
import { Button, Form, Input, Typography, message, Card } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const setToken = useAuthStore((state) => state.setToken);

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            const response = await api.post('/auth/login', {
                phone: values.phone,
                pin: values.pin,
            });

            const { token } = response.data;
            setToken(token); // Сохраняем в Zustand (и в localStorage)
            message.success('Вход выполнен!');
            navigate('/scan'); // Перекидываем на сканер
        } catch (error: any) {
            if (error.response?.status === 403) {
                message.error('Неверный телефон или PIN');
            } else {
                message.error('Ошибка подключения к серверу');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: '#F5F6F8'
        }}>
            <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
                    Складской учёт
                </Typography.Title>

                <Form layout="vertical" onFinish={onFinish}>
                    <Form.Item
                        label="Номер телефона"
                        name="phone"
                        rules={[{ required: true, message: 'Введите номер телефона' }]}
                    >
                        <Input placeholder="79000000000" size="large" />
                    </Form.Item>

                    <Form.Item
                        label="PIN-код"
                        name="pin"
                        rules={[{ required: true, message: 'Введите PIN' }]}
                    >
                        <Input.Password placeholder="****" size="large" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block size="large">
                            Войти
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}