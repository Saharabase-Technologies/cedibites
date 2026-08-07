import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

let router: AppRouterInstance | null = null;

export function setNavigationRouter(instance: AppRouterInstance): void {
  router = instance;
}

export function navigateTo(path: string): void {
  if (router) {
    router.push(path);
  } else {
    // Fallback before the router is initialized (e.g. very early 401s)
    window.location.href = path;
  }
}
