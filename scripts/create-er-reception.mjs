import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: 'er-reception@zion.com' }
  })

  if (existing) {
    console.log('ER Reception user already exists')
    await prisma.$disconnect()
    return
  }

  const hashed = await bcrypt.hash('errecep2025', 12)
  
  const user = await prisma.user.create({
    data: {
      name: 'ER Reception',
      email: 'er-reception@zion.com',
      password: hashed,
      role: 'RECEPTIONIST',
    }
  })

  console.log('✅ ER Reception user created:')
  console.log('   Email:', user.email)
  console.log('   Password: errecep2025')
  console.log('   Role:', user.role)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
