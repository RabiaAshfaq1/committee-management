/**
 * Demo seed — deletes only @committee-seed.demo users and their committees.
 * Organizer + 4 members · one committee · 2 rounds (splits + payout tx).
 *
 *   npm run seed
 *
 * Password for all: SeedDemo123!
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SUFFIX = '@committee-seed.demo';
const DEMO_PASSWORD = 'SeedDemo123!';

async function main(): Promise<void> {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const emails = {
    org: `organizer${SUFFIX}`,
    m1: `member1${SUFFIX}`,
    m2: `member2${SUFFIX}`,
    m3: `member3${SUFFIX}`,
    m4: `member4${SUFFIX}`,
  };

  const seedIds = (
    await prisma.user.findMany({
      where: { email: { endsWith: SUFFIX } },
      select: { id: true },
    })
  ).map((u) => u.id);

  const commIds =
    seedIds.length > 0
      ? (await prisma.committee.findMany({ where: { organizerId: { in: seedIds } }, select: { id: true } })).map(
          (c) => c.id,
        )
      : [];

  if (commIds.length > 0) {
    // Legacy DBs may still have Payment rows (old schema) blocking round deletes
    const idList = commIds.map((id) => `'${id}'`).join(', ');
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "Payment" WHERE "roundId" IN (SELECT id FROM "Round" WHERE "committeeId" IN (${idList}))`,
      );
    } catch {
      /* Payment table dropped after prisma db push */
    }
    await prisma.round.deleteMany({ where: { committeeId: { in: commIds } } });
    await prisma.committeeMember.deleteMany({ where: { committeeId: { in: commIds } } });
    await prisma.committee.deleteMany({ where: { id: { in: commIds } } });
  }
  await prisma.user.deleteMany({ where: { email: { endsWith: SUFFIX } } });

  const organizer = await prisma.user.create({
    data: {
      name: 'Seed Organizer',
      email: emails.org,
      password: hash,
      role: 'ORGANIZER',
      phone: '+923002222222',
    },
  });

  const members = await Promise.all([
    prisma.user.create({
      data: { name: 'Seed Member 1', email: emails.m1, password: hash, role: 'MEMBER', cnic: '61101-1111111-1' },
    }),
    prisma.user.create({
      data: { name: 'Seed Member 2', email: emails.m2, password: hash, role: 'MEMBER', cnic: '61101-1111112-1' },
    }),
    prisma.user.create({
      data: { name: 'Seed Member 3', email: emails.m3, password: hash, role: 'MEMBER', cnic: '61101-1111113-1' },
    }),
    prisma.user.create({
      data: { name: 'Seed Member 4', email: emails.m4, password: hash, role: 'MEMBER', cnic: '61101-1111114-1' },
    }),
  ]);

  const pool = 10000;

  const committee = await prisma.committee.create({
    data: {
      name: 'Seed Savings Circle',
      description: 'Demo: monthly pool 10,000 — splits flexible (e.g. 5k+5k).',
      totalMembers: 4,
      monthlyAmount: pool,
      startDate: new Date(),
      durationMonths: 12,
      turnAssignment: 'MANUAL',
      status: 'ACTIVE',
      organizerId: organizer.id,
    },
  });

  const roster = await Promise.all([
    prisma.committeeMember.create({
      data: { committeeId: committee.id, userId: members[0].id, turnNumber: 1 },
    }),
    prisma.committeeMember.create({
      data: { committeeId: committee.id, userId: members[1].id, turnNumber: 2 },
    }),
    prisma.committeeMember.create({
      data: { committeeId: committee.id, userId: members[2].id, turnNumber: 3 },
    }),
    prisma.committeeMember.create({
      data: { committeeId: committee.id, userId: members[3].id, turnNumber: 4 },
    }),
  ]);

  await prisma.round.create({
    data: {
      committeeId: committee.id,
      roundNumber: 1,
      payoutUserId: members[2].id,
      payoutAmount: pool,
      payoutTransactionId: 'SEED-TX-R1-778899',
      status: 'COMPLETED',
      dueDate: new Date(Date.now() - 45 * 86400000),
      contributionSplits: {
        create: [
          { memberId: roster[0].id, amount: 5000 },
          { memberId: roster[1].id, amount: 5000 },
        ],
      },
    },
  });

  await prisma.round.create({
    data: {
      committeeId: committee.id,
      roundNumber: 2,
      payoutUserId: members[1].id,
      payoutAmount: pool,
      status: 'ACTIVE',
      dueDate: new Date(Date.now() + 7 * 86400000),
      contributionSplits: {
        create: roster.map((r) => ({ memberId: r.id, amount: pool / 4 })),
      },
    },
  });

  console.log('\n✅ Seed finished.');
  console.log('──────────────────────────────────────────────');
  console.log(`Committee: ${committee.name}`);
  console.log('Password:', DEMO_PASSWORD);
  console.log('  ORGANIZER', emails.org);
  console.log('  MEMBERS ', emails.m1, emails.m2, emails.m3, emails.m4);
  console.log('──────────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
