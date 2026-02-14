import type { PrismaClient } from '@prisma/client'

const config = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
} satisfies PrismaClient.PrismaConfig

export default config
