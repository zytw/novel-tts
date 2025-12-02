import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/global.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { MessageUtils } from './services/api'

const app = createApp(App)
const pinia = createPinia()

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 全局错误处理
app.config.errorHandler = (err, vm, info) => {
  console.error('Vue Error:', err, info)
  MessageUtils.error('应用出现错误，请刷新页面重试')
}

// 未捕获的Promise错误处理
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Rejection:', event.reason)
  MessageUtils.error('操作失败，请稍后重试')
  event.preventDefault()
})

// 网络错误监听
window.addEventListener('online', () => {
  MessageUtils.success('网络连接已恢复')
})

window.addEventListener('offline', () => {
  MessageUtils.warning('网络连接已断开，请检查网络设置')
})

app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.mount('#app')
