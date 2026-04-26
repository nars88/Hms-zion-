import { prisma } from '@/lib/prisma'

export async function getUserFromToken(token: string): Promise<{
  id: string
  role: string
} | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: token },
      select: { id: true, role: true },
    })
    return user
  } catch {
    return null
  }
}
