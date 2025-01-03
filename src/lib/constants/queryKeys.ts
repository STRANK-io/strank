export const QUERY_KEYS = {
  USER: {
    INFO: (userId: string) => ['user', 'info', userId] as const,
  },
} as const
