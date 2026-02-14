import type { PrismaClient } from '@prisma/client'

const config = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
} satisfies any

export default config
