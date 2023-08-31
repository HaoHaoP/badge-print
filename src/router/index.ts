import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        name: '首页',
        component: () => import('../pages/index.vue')
    }
]
const router = createRouter({
    history: createWebHashHistory(),
    routes
})
export default router
