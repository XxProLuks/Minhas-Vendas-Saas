import bcrypt from 'bcrypt';
import { PrismaClient, PlanType, SaleStatus, PaymentMethod } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('SenhaSegura123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@minhasvendas.app' },
    update: {},
    create: {
      name: 'Demo Vendedor',
      email: 'demo@minhasvendas.app',
      password: passwordHash,
      plan: PlanType.PRO,
      emailVerifiedAt: new Date()
    }
  });

  const clienteJoao = await prisma.customer.create({
    data: {
      name: 'João da Silva',
      phone: '+55 11 99888-7766',
      address: 'Rua das Vendas, 123',
      userId: user.id
    }
  });

  const clienteMaria = await prisma.customer.create({
    data: {
      name: 'Maria Souza',
      phone: '+55 11 99777-6655',
      address: 'Av. Negócios, 321',
      userId: user.id
    }
  });

  await prisma.sale.createMany({
    data: [
      {
        description: 'Consultoria Premium',
        amount: 1200.0,
        paymentMethod: PaymentMethod.CREDIT,
        status: SaleStatus.PAID,
        soldAt: new Date(),
        userId: user.id,
        customerId: clienteJoao.id
      },
      {
        description: 'Treinamento intensivo',
        amount: 850.0,
        paymentMethod: PaymentMethod.PIX,
        status: SaleStatus.PAID,
        soldAt: new Date(),
        userId: user.id,
        customerId: clienteMaria.id
      }
    ]
  });

  await prisma.expense.createMany({
    data: [
      {
        title: 'Assinatura CRM',
        amount: 149.9,
        occurredAt: new Date(),
        userId: user.id
      },
      {
        title: 'Anúncios Instagram',
        amount: 300.0,
        occurredAt: new Date(),
        userId: user.id
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });