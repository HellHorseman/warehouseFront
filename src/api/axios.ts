import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const host = window.location.hostname; // Получаем IP или localhost, с которого открыта страница
const port = '8080';

export const api = axios.create({
    baseURL: `http://${host}:${port}/api`,
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Выкидываем на логин ТОЛЬКО если токен протух (401)
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
            window.location.href = '/login';
        }
        // Если 403 или 500 — просто отдаем ошибку дальше, чтобы компонент показал message.error
        return Promise.reject(error);
    }
);