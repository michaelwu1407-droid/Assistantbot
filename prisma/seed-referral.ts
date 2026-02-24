import { PrismaClient } from '@prisma/client'
import { nanoid } from 'nanoid'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding referral program...')

  // Create default referral program
  const referralProgram = await prisma.referralProgram.upsert({
    where: { id: 'default-referral-program' },
    update: {
      name: 'Earlymark Pro Referral',
      description: 'Earn $29 credit for every friend who upgrades to Earlymark Pro',
      rewardType: 'credit',
      rewardValue: 29.00,
      rewardCurrency: 'USD',
      isActive: true,
      referredRewardType: 'discount',
      referredRewardValue: 10.00,
      referredRewardCurrency: 'USD',
    },
    create: {
      id: 'default-referral-program',
      name: 'Earlymark Pro Referral',
      description: 'Earn $29 credit for every friend who upgrades to Earlymark Pro',
      rewardType: 'credit',
      rewardValue: 29.00,
      rewardCurrency: 'USD',
      isActive: true,
      referredRewardType: 'discount',
      referredRewardValue: 10.00,
      referredRewardCurrency: 'USD',
    },
  })

  console.log('✅ Referral program created/updated:', referralProgram.name)

  // Create referral links for existing users (if any)
  const users = await prisma.user.findMany({
    take: 10, // Limit to first 10 users for initial seed
  })

  console.log(`👥 Creating referral links for ${users.length} users...`)

  for (const user of users) {
    try {
      const existingReferral = await prisma.referral.findFirst({
        where: {
          userId: user.id,
          programId: referralProgram.id,
        },
      })

      if (!existingReferral) {
        const referralCode = nanoid(8).toUpperCase()
        
        await prisma.referral.create({
          data: {
            userId: user.id,
            programId: referralProgram.id,
            referralCode,
          },
        })
        
        console.log(`  ✅ Created referral for ${user.name || user.email}: ${referralCode}`)
      } else {
        console.log(`  ⏭️ Referral already exists for ${user.name || user.email}: ${existingReferral.referralCode}`)
      }
    } catch (error) {
      console.error(`  ❌ Error creating referral for ${user.email}:`, error)
    }
  }

  console.log('🎉 Referral seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding referral program:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
