const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    console.log('Updating admins...');
    const result = await prisma.employee.updateMany({
        where: { email: { endsWith: '@admin.com' } },
        data: { role: 'ADMIN' }
    });
    console.log('Updated', result.count, 'accounts to ADMIN role');
}
main().catch(console.error).finally(() => prisma.$disconnect());
