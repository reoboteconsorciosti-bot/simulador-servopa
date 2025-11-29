import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@servopa.com.br';
    const password = 'admin'; // Senha padrão inicial
    const name = 'Administrador';

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (!existingUser) {
        const passwordHash = await bcrypt.hash(password, 10);
        await prisma.user.create({
            data: {
                email,
                passwordHash,
                name,
                role: 'Admin',
                teamId: 'Geral',
            },
        });
        console.log(`User ${email} created with password: ${password}`);
    } else {
        console.log(`User ${email} already exists.`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
