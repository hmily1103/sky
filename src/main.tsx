import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

// 注意：未启用 StrictMode，避免开发模式下 R3F/音频上下文被重复挂载造成闪烁与重复初始化。
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />)
