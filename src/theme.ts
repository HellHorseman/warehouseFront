import type { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
    token: {
        colorPrimary: '#1E5EFF',
        colorTextBase: '#FFFFFF',
        colorBgBase: '#000000',
        colorBorder: '#333333',
        borderRadius: 8,
        fontFamily: "'Inter', -apple-system, sans-serif",
    },
    components: {
        Layout: {
            headerBg: '#000000',
            headerColor: '#FFFFFF',
            siderBg: '#000000',
            bodyBg: '#000000',
        },
        Menu: {
            darkItemBg: '#000000',
            darkItemSelectedBg: '#1E5EFF',
            darkItemSelectedColor: '#FFFFFF',
            darkItemColor: '#9CA3AF',
            darkItemHoverBg: 'transparent',
        },
        Card: {
            colorBgContainer: '#111111',
            colorText: '#FFFFFF',
            colorBorderSecondary: '#333333',
        }
    },
};