import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'adminsample123@admin.com';
    const admin = await prisma.employee.findUnique({ where: { email } });

    if (admin) {
        await prisma.employee.update({
            where: { email },
            data: {
                isSuperAdmin: true,
                isAdminApproved: true,
                role: 'ADMIN'
            }
        });
        console.log(`Updated ${email} to Super Admin`);
    } else {
        console.log(`Admin ${email} not found. Please register first.`);
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
