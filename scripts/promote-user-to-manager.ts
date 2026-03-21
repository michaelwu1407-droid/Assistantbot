/**
 * One-off dev helper: set a user's role to MANAGER (for testing Kanban approval, team actions, etc.).
 *
 * Usage (from repo root):
 *   npx tsx scripts/promote-user-to-manager.ts your@email.com
 *
 * Loads `.env.local` then `.env` so DATABASE_URL matches Next.js.
 */
import { config } from "dotenv"
import { resolve } from "node:path"
import { PrismaClient } from "@prisma/client"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]?.trim().toLowerCase()
  if (!email) {
    console.error("Usage: npx tsx scripts/promote-user-to-manager.ts user@example.com")
    process.exit(1)
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`No user found with email: ${email}`)
    process.exit(1)
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "MANAGER" },
  })

  console.log(`Updated ${email} → MANAGER (was ${user.role}).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
