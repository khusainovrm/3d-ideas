import { createRouter, createWebHistory } from 'vue-router'
import { experiments } from '../config/experiments'

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'catalog', component: () => import('../views/CatalogView.vue') },
    ...experiments.map((experiment) => ({
      path: `/experiments/${experiment.slug}`,
      name: experiment.slug,
      component: experiment.component,
    })),
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
