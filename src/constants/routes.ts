export const ROUTES = {
  HOME: '/',
  NEW_MEMO: '/new',
  MEMO_DETAIL: (id: string) => `/memo/${id}`,
  MIND_MAP: '/mindmap',
  TAGS: '/tags',
  SETTINGS: '/settings',
  LOGIN: '/login',
} as const;
