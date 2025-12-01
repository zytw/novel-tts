import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/models',
    name: 'Models',
    component: () => import('../views/Models.vue')
  },
  {
    path: '/models/new',
    name: 'NewModel',
    component: () => import('../views/ModelForm.vue')
  },
  {
    path: '/models/:id/edit',
    name: 'EditModel',
    component: () => import('../views/ModelForm.vue')
  },
  {
    path: '/novel',
    name: 'Novel',
    component: () => import('../views/Novel.vue')
  },
  {
    path: '/analysis',
    name: 'Analysis',
    component: () => import('../views/Analysis.vue')
  },
  {
    path: '/tts',
    name: 'TTS',
    component: () => import('../views/TTS.vue')
  },
  {
    path: '/subtitle',
    name: 'Subtitle',
    component: () => import('../views/Subtitle.vue')
  },
  {
    path: '/file-output',
    name: 'FileOutput',
    component: () => import('../views/FileOutput.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router