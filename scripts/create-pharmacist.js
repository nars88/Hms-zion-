const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Creating pharmacist user...')

  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: 'pharmacy@zion.com' },
    })

    if (existing) {
      // Update existing user
      const updated = await prisma.user.update({
        where: { email: 'pharmacy@zion.com' },
        data: {
          password: 'zion123', // Plain text (matching login API)
          name: 'Senior Pharmacist',
          role: 'PHARMACIST',
          phone: '+964 750 000 0005',
        },
      })

      console.log('✅ Pharmacist user updated successfully!')
      console.log('   Email:', updated.email)
      console.log('   Name:', updated.name)
      console.log('   Role:', updated.role)
      console.log('   ID:', updated.id)
    } else {
      // Create new user
      const user = await prisma.user.create({
        data: {
          email: 'pharmacy@zion.com',
          password: 'zion123', // Plain text (matching login API)
          name: 'Senior Pharmacist',
          role: 'PHARMACIST',
          phone: '+964 750 000 0005',
        },
      })

      console.log('✅ Pharmacist user created successfully!')
      console.log('   Email:', user.email)
      console.log('   Name:', user.name)
      console.log('   Role:', user.role)
      console.log('   ID:', user.id)
    }

    console.log('\n📝 Login credentials:')
    console.log('   Email: pharmacy@zion.com')
    console.log('   Password: zion123')
    console.log('\n✨ You can now login with these credentials!')
  } catch (error) {
    console.error('❌ Error creating pharmacist user:', error)
    if (error.code === 'P2002') {
      console.error('   User with this email already exists')
    }
    throw error
  }
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

