import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { hashPassword } from '../src/lib/passwords';
import { userCreateSchema } from '../src/lib/validation';
import { terminalPassword } from './terminal-password';

const prisma = new PrismaClient();
async function main() {
  try {
    if (await prisma.adminUser.count({ where: { active: true } })) {
      throw new Error(
        'An active admin already exists. Use Admin > Staff Users to assign additional admin credentials.',
      );
    }
    const io = createInterface({ input, output });
    let email: string;
    let name: string;
    try {
      email = (await io.question('Admin email: ')).trim().toLowerCase();
      name = (await io.question('Admin name: ')).trim();
    } finally {
      io.close();
    }
    const password = await terminalPassword(
      'Password (12+ characters, max 72 UTF-8 bytes; hidden): ',
    );
    const confirmation = await terminalPassword('Confirm password (hidden): ');
    if (password !== confirmation) throw new Error('Passwords do not match');
    const parsed = userCreateSchema.safeParse({ email, name, password, active: true });
    if (!parsed.success)
      throw new Error(
        'Use a valid email/name and a password with 12+ characters, at most 72 UTF-8 bytes.',
      );
    await prisma.adminUser.create({
      data: {
        email,
        name,
        passwordHash: await hashPassword(password),
        role: 'ADMIN',
      },
    });
    console.log('Admin created. Sign in at /admin/login with the credentials you assigned.');
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  // Prisma errors can contain connection details; only display intentional validation messages.
  if (error instanceof Error && !error.name.startsWith('Prisma')) console.error(error.message);
  else console.error('Unable to create admin. Check database connectivity and existing accounts.');
  process.exitCode = 1;
});
