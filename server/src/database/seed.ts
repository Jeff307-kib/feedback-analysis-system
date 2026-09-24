import { db } from './index';
import { users } from './schema';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('ADMIN_EMAIL or ADMIN_DEFAULT_PASSWORD is not set in the environment variables.');
    process.exit(1);
  }

  try {
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    await db.insert(users).values({
      username: 'Super Admin',
      email: adminEmail.toLowerCase(),
      passwordHash,
      role: 'ADMIN',
      hasUsedFreeTrial: true, // Admins don't need free trials
    });

    console.log('Super Admin account seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding Super Admin account:', error);
    process.exit(1);
  }
}

seedAdmin();
