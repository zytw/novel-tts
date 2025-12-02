import { createRouter, createWebHistory } from 'vue-router'
import { MessageUtils } from '../services/api'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { title: '首页 - AI小说创作与语音合成平台' }
  },
  {
    path: '/models',
    name: 'Models',
    component: () => import('../views/Models.vue'),
    meta: { title: 'AI模型配置' }
  },
  {
    path: '/models/new',
    name: 'NewModel',
    component: () => import('../views/ModelForm.vue'),
    meta: { title: '添加AI模型' }
  },
  {
    path: '/models/:id/edit',
    name: 'EditModel',
    component: () => import('../views/ModelForm.vue'),
    meta: { title: '编辑AI模型' }
  },
  {
    path: '/novel',
    name: 'Novel',
    component: () => import('../views/Novel.vue'),
    meta: { title: 'AI小说生成' }
  },
  {
    path: '/analysis',
    name: 'Analysis',
    component: () => import('../views/Analysis.vue'),
    meta: { title: '小说角色分析' }
  },
  {
    path: '/tts',
    name: 'TTS',
    component: () => import('../views/TTS.vue'),
    meta: { title: 'TTS语音合成' }
  },
  {
    path: '/subtitle',
    name: 'Subtitle',
    component: () => import('../views/Subtitle.vue'),
    meta: { title: '字幕生成' }
  },
  {
    path: '/file-output',
    name: 'FileOutput',
    component: () => import('../views/FileOutput.vue'),
    meta: { title: '文件输出管理' }
  },
  {
    path: '/api-docs',
    name: 'ApiDocs',
    component: () => import('../views/ApiDocs.vue'),
    meta: { title: 'API文档' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue'),
    meta: { title: '页面未找到' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局前置守卫
router.beforeEach(async (to, from, next) => {
  // 设置页面标题
  if (to.meta?.title) {
    document.title = to.meta.title
  }

  // 显示加载状态（可选）
  if (from.name && to.name !== from.name) {
    // 可以在这里添加页面切换加载逻辑
  }

  next()
})

// 全局后置守卫
router.afterEach((to, from) => {
  // 路由切换成功后可以执行的操作
  console.log(`导航完成: ${from.name} -> ${to.name}`)
})

// 全局错误处理
router.onError((error) => {
  console.error('Router error:', error)
  MessageUtils.error('页面加载失败，请重试')
})

export default router
