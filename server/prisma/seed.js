const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@servopa.com.br';
    const password = 'admin'; // Senha padrão inicial
    const name = 'Administrador';

    console.log(`Checking if user ${email} exists...`);

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (!existingUser) {
        console.log(`Creating user ${email}...`);
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
        console.log(`User ${email} created successfully with password: ${password}`);
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
