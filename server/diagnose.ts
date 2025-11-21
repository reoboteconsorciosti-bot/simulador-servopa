import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function diagnose() {
    console.log("--- Starting Diagnosis ---");

    try {
        // 1. Check DB Connection
        console.log("1. Testing Database Connection...");
        const userCount = await prisma.user.count();
        console.log(`   Success! Found ${userCount} users in the database.`);

        // 2. Check Admin User
        console.log("2. Checking Admin User...");
        const email = 'admin@servopa.com.br';
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            console.error("   ERROR: Admin user not found!");
            return;
        }
        console.log("   Success! Admin user found:", user.email);

        // 3. Verify Password
        console.log("3. Verifying Password...");
        const password = 'admin';
        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (isValid) {
            console.log("   Success! Password 'admin' is valid.");
        } else {
            console.error("   ERROR: Password 'admin' is INVALID.");
            console.log("   Hash in DB:", user.passwordHash);

            // Attempt to fix
            console.log("   Attempting to reset password to 'admin'...");
            const newHash = await bcrypt.hash(password, 10);
            await prisma.user.update({
                where: { email },
                data: { passwordHash: newHash }
            });
            console.log("   Password reset complete.");
        }

    } catch (error) {
        console.error("--- DIAGNOSIS FAILED ---");
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

diagnose();
