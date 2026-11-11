import type { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
    token: {
        colorPrimary: '#1E5EFF',      // синий
        colorTextBase: '#111111',     // почти чёрный
        colorBorder: '#D9D9D9',       // серый
        colorBgLayout: '#F5F6F8',     // светло-серый фон
        borderRadius: 6,
        fontFamily: "'Inter', -apple-system, sans-serif",
    },
    components: {
        Layout: {
            headerBg: '#111111',
            headerColor: '#FFFFFF',
            siderBg: '#1A1A1A',
        },
        Table: {
            headerBg: '#F5F6F8',
            headerColor: '#111111',
        },
    },
};