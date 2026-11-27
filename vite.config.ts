import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl' // <-- Добавь импорт


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl() // <-- Добавь в массив плагинов
  ],
  server: {
    host: true, // Разрешает доступ по сети
    // https: true // Включает HTTPS
  }
})
