import { createRouter, createWebHistory } from 'vue-router'
import UploadView from '../views/UploadView.vue'

const APP_TITLE = '閱卷通'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior() {
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'upload',
      component: UploadView,
      meta: { title: '上傳考卷' },
    },
    {
      path: '/label',
      name: 'label',
      component: () => import('../views/LabelView.vue'),
      meta: { title: '標註答案區' },
    },
    {
      path: '/results',
      name: 'results',
      component: () => import('../views/ResultsView.vue'),
      meta: { title: '批改結果' },
    },
    {
      // 未知路徑一律回到上傳頁
      path: '/:pathMatch(.*)*',
      redirect: { name: 'upload' },
    },
  ],
})

router.afterEach((to) => {
  const pageTitle = to.meta.title as string | undefined
  document.title = pageTitle ? `${pageTitle}｜${APP_TITLE}` : APP_TITLE
})

export default router
