import bcrypt from "bcryptjs"

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(input: { hash: string; password: string }): Promise<boolean> {
  if (!/^\$2[aby]\$\d\d\$/.test(input.hash)) return false
  return bcrypt.compare(input.password, input.hash)
}
