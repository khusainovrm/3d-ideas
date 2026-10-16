import { createRouter, createWebHistory } from 'vue-router'
import { experiments } from '../config/experiments'

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: (to, _from, savedPosition) => {
    if (savedPosition) return savedPosition
    if (to.hash && to.hash !== '#debug') {
      return { el: to.hash, behavior: 'smooth' }
    }
    return { top: 0 }
  },
  routes: [
    { path: '/', name: 'catalog', component: () => import('../views/CatalogView.vue') },
    { path: '/arrow', name: 'arrow', component: () => import('../experiments/arrow/Arrow.vue') },
    { path: '/landing', name: 'landing', component: () => import('../experiments/landing/Landing.vue') },
    ...experiments.map((experiment) => ({
      path: `/experiments/${experiment.slug}`,
      name: experiment.slug,
      component: experiment.component,
    })),
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
