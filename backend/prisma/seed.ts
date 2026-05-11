/**
 * Amanat demo data. Password for all demo accounts: Test1234!
 * Run from backend: npm run seed
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { evaluateBadges } from '../src/utils/badge.engine';
import { persistTrustScore } from '../src/utils/trust.score';

const prisma = new PrismaClient();
const DEMO_PW = 'Test1234!';

const BADGES = [
  {
    name: 'Amanatdaar',
    description: 'Paid on time in 5+ consecutive rounds.',
    icon: 'shield-check',
    color: '#10B981',
    condition: 'consecutive_paid_5',
  },
  {
    name: 'Wafadaar Saathi',
    description: 'Successfully completed 3+ committees.',
    icon: 'star',
    color: '#3B82F6',
    condition: 'committees_completed_3',
  },
  {
    name: 'Naya Rukn',
    description: 'Joined the first committee.',
    icon: 'user-plus',
    color: '#6B7280',
    condition: 'first_committee',
  },
  {
    name: 'Bharosemand',
    description: 'Maintained a perfect payment history.',
    icon: 'medal',
    color: '#F59E0B',
    condition: 'payment_rate_100',
  },
  {
    name: 'Sargaram',
    description: 'Active in 3+ committees simultaneously.',
    icon: 'fire',
    color: '#F97316',
    condition: 'active_committees_3',
  },
  {
    name: 'Tawajju Darkaar',
    description: 'Multiple payments overdue.',
    icon: 'warning',
    color: '#EF4444',
    condition: 'missed_payments_2',
  },
] as const;

const LEGACY_BADGE_NAMES = [
  'Amanatdar',
  'Purana Saathi',
  'Naya Saathi',
  'Bharosa',
  'Mehnat Kash',
  'Fikarmand',
] as const;

async function removeLegacyBadges(): Promise<void> {
  const legacy = await prisma.badge.findMany({
    where: { name: { in: [...LEGACY_BADGE_NAMES] } },
    select: { id: true },
  });
  const legacyIds = legacy.map((b) => b.id);
  if (!legacyIds.length) return;
  await prisma.userBadge.deleteMany({ where: { badgeId: { in: legacyIds } } });
  await prisma.badge.deleteMany({ where: { id: { in: legacyIds } } });
}

async function wipeAmanatDemo(): Promise<void> {
  const existing = await prisma.user.findMany({
    where: {
      OR: [{ email: { endsWith: '@amanat.demo' } }, { email: { endsWith: '@amanat-seed.demo' } }],
    },
    select: { id: true },
  });
  const ids = existing.map((u) => u.id);
  if (!ids.length) return;

  const comms = await prisma.committee.findMany({
    where: { adminId: { in: ids } },
    select: { id: true },
  });
  for (const c of comms) {
    await prisma.payment.deleteMany({ where: { round: { committeeId: c.id } } });
    await prisma.round.deleteMany({ where: { committeeId: c.id } });
    await prisma.feedback.deleteMany({ where: { committeeId: c.id } });
    await prisma.committeeMember.deleteMany({ where: { committeeId: c.id } });
    await prisma.committee.delete({ where: { id: c.id } });
  }

  await prisma.feedback.deleteMany({
    where: { OR: [{ fromUserId: { in: ids } }, { toUserId: { in: ids } }] },
  });
  await prisma.userBadge.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

async function upsertBadgeGrant(userId: string, badgeName: string): Promise<void> {
  const badge = await prisma.badge.findUnique({ where: { name: badgeName } });
  if (!badge) return;
  await prisma.userBadge.upsert({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
    create: { userId, badgeId: badge.id },
    update: {},
  });
}

async function main(): Promise<void> {
  await removeLegacyBadges();

  for (const b of BADGES) {
    await prisma.badge.upsert({
      where: { name: b.name },
      create: b,
      update: { description: b.description, icon: b.icon, color: b.color, condition: b.condition },
    });
  }
  console.log('Badges OK:', BADGES.length);

  await wipeAmanatDemo();

  const hash = await bcrypt.hash(DEMO_PW, 12);
  const ago = (days: number) => new Date(Date.now() - days * 86400000);

  const admin = await prisma.user.create({
    data: {
      name: 'Ahmed Khan',
      email: 'admin@amanat.demo',
      password: hash,
      role: 'ADMIN',
      phone: '+923001112223',
      createdAt: ago(400),
    },
  });

  const sara = await prisma.user.create({
    data: {
      name: 'Sara Malik',
      email: 'sara@amanat.demo',
      password: hash,
      role: 'MEMBER',
      phone: '+923111111111',
      createdAt: ago(500),
    },
  });
  const bilal = await prisma.user.create({
    data: {
      name: 'Bilal Ahmed',
      email: 'bilal@amanat.demo',
      password: hash,
      role: 'MEMBER',
      phone: '+923222222222',
      createdAt: ago(200),
    },
  });
  const zara = await prisma.user.create({
    data: {
      name: 'Zara Hassan',
      email: 'zara@amanat.demo',
      password: hash,
      role: 'MEMBER',
      phone: '+923333333333',
      createdAt: ago(30),
    },
  });
  const usman = await prisma.user.create({
    data: {
      name: 'Usman Ali',
      email: 'usman@amanat.demo',
      password: hash,
      role: 'MEMBER',
      phone: '+923444444444',
      createdAt: ago(120),
    },
  });
  const fatima = await prisma.user.create({
    data: {
      name: 'Fatima Noor',
      email: 'fatima@amanat.demo',
      password: hash,
      role: 'MEMBER',
      phone: '+923555555555',
      createdAt: ago(300),
    },
  });
  const kamran = await prisma.user.create({
    data: {
      name: 'Kamran Butt',
      email: 'kamran@amanat.demo',
      password: hash,
      role: 'MEMBER',
      phone: '+923666666666',
      createdAt: ago(150),
    },
  });

  const gulshan = await prisma.committee.create({
    data: {
      name: 'Gulshan Committee',
      description: 'Neighborhood rotating savings — transparent turns and payouts.',
      totalSlots: 6,
      monthlyAmount: 10000,
      startDate: ago(240),
      durationMonths: 8,
      turnMethod: 'MANUAL',
      status: 'ACTIVE',
      adminId: admin.id,
    },
  });

  const shareG = gulshan.monthlyAmount / 6;
  const gMembers = [
    { user: sara, turn: 1 },
    { user: bilal, turn: 2 },
    { user: zara, turn: 3 },
    { user: usman, turn: 4 },
    { user: fatima, turn: 5 },
    { user: kamran, turn: 6 },
  ];
  const gCm: { id: string; userId: string }[] = [];
  for (const { user, turn } of gMembers) {
    const row = await prisma.committeeMember.create({
      data: {
        userId: user.id,
        committeeId: gulshan.id,
        turnNumber: turn,
        shareCount: 1,
        shareAmount: shareG,
      },
    });
    gCm.push({ id: row.id, userId: user.id });
  }
  const cmByUser = (uid: string) => gCm.find((x) => x.userId === uid)!.id;

  const pastDue = ago(14);
  const activeDue = ago(-7);

  for (let rn = 1; rn <= 4; rn++) {
    const payoutIdx = (rn - 1) % 6;
    const payoutUserId = gMembers[payoutIdx].user.id;
    const r = await prisma.round.create({
      data: {
        committeeId: gulshan.id,
        roundNumber: rn,
        payoutUserId,
        status: 'COMPLETED',
        dueDate: pastDue,
        recipientTransactionId: `TX-G-${rn}`,
      },
    });
    for (const m of gMembers) {
      const isUsmanLate = m.user.id === usman.id && rn >= 4;
      await prisma.payment.create({
        data: {
          roundId: r.id,
          memberId: cmByUser(m.user.id),
          userId: m.user.id,
          amount: shareG,
          status: isUsmanLate ? 'PENDING' : 'PAID',
          transactionId: isUsmanLate ? null : `pay-${rn}-${m.user.id.slice(0, 6)}`,
          paidAt: isUsmanLate ? null : pastDue,
          dueDate: pastDue,
        },
      });
    }
  }

  const r5 = await prisma.round.create({
    data: {
      committeeId: gulshan.id,
      roundNumber: 5,
      payoutUserId: fatima.id,
      status: 'ACTIVE',
      dueDate: activeDue,
    },
  });
  for (const m of gMembers) {
    const pend = m.user.id === usman.id || m.user.id === zara.id;
    await prisma.payment.create({
      data: {
        roundId: r5.id,
        memberId: cmByUser(m.user.id),
        userId: m.user.id,
        amount: shareG,
        status: pend ? 'PENDING' : 'PAID',
        transactionId: pend ? null : `pay-5-${m.user.id.slice(0, 6)}`,
        paidAt: pend ? null : new Date(),
        dueDate: activeDue,
      },
    });
  }

  const defence = await prisma.committee.create({
    data: {
      name: 'Defence Savings Circle',
      description: 'Higher monthly pool — trusted members.',
      totalSlots: 4,
      monthlyAmount: 25000,
      startDate: ago(120),
      durationMonths: 6,
      turnMethod: 'MANUAL',
      status: 'ACTIVE',
      adminId: admin.id,
    },
  });
  const shareD = defence.monthlyAmount / 4;
  const dMembers = [
    { user: sara, turn: 1 },
    { user: bilal, turn: 2 },
    { user: fatima, turn: 3 },
    { user: kamran, turn: 4 },
  ];
  const dCm: { id: string; userId: string }[] = [];
  for (const { user, turn } of dMembers) {
    const row = await prisma.committeeMember.create({
      data: {
        userId: user.id,
        committeeId: defence.id,
        turnNumber: turn,
        shareCount: 1,
        shareAmount: shareD,
      },
    });
    dCm.push({ id: row.id, userId: user.id });
  }
  const dcmByUser = (uid: string) => dCm.find((x) => x.userId === uid)!.id;

  for (let rn = 1; rn <= 2; rn++) {
    const payoutUserId = dMembers[rn - 1].user.id;
    const r = await prisma.round.create({
      data: {
        committeeId: defence.id,
        roundNumber: rn,
        payoutUserId,
        status: 'COMPLETED',
        dueDate: pastDue,
        recipientTransactionId: `TX-D-${rn}`,
      },
    });
    for (const m of dMembers) {
      await prisma.payment.create({
        data: {
          roundId: r.id,
          memberId: dcmByUser(m.user.id),
          userId: m.user.id,
          amount: shareD,
          status: 'PAID',
          transactionId: `d-${rn}-${m.user.id.slice(0, 6)}`,
          paidAt: pastDue,
          dueDate: pastDue,
        },
      });
    }
  }

  const clifton = await prisma.committee.create({
    data: {
      name: 'Clifton Micro-Savings',
      description: 'Smaller pool for quick cycles.',
      totalSlots: 4,
      monthlyAmount: 5000,
      startDate: ago(60),
      durationMonths: 4,
      turnMethod: 'SPIN',
      status: 'ACTIVE',
      adminId: admin.id,
    },
  });
  const shareC = clifton.monthlyAmount / 4;
  const cMembers = [
    { user: kamran, turn: 1 },
    { user: sara, turn: 2 },
    { user: bilal, turn: 3 },
    { user: zara, turn: 4 },
  ];
  for (const { user, turn } of cMembers) {
    await prisma.committeeMember.create({
      data: {
        userId: user.id,
        committeeId: clifton.id,
        turnNumber: turn,
        shareCount: 1,
        shareAmount: shareC,
      },
    });
  }

  await prisma.feedback.createMany({
    data: [
      {
        fromUserId: admin.id,
        toUserId: sara.id,
        committeeId: gulshan.id,
        rating: 5,
        comment: 'Bohat reliable — hamesha time par.',
      },
      {
        fromUserId: admin.id,
        toUserId: sara.id,
        committeeId: gulshan.id,
        rating: 5,
        comment: 'Great partner in the circle (admin note after round 2).',
      },
      {
        fromUserId: admin.id,
        toUserId: fatima.id,
        committeeId: gulshan.id,
        rating: 5,
        comment: 'Amanat ka poora khayal.',
      },
      {
        fromUserId: admin.id,
        toUserId: bilal.id,
        committeeId: gulshan.id,
        rating: 4,
        comment: 'Solid member; communicates clearly.',
      },
      {
        fromUserId: admin.id,
        toUserId: zara.id,
        committeeId: gulshan.id,
        rating: 3,
        comment: 'Naye hain, abhi seekh rahe hain — theek ja rahe hain.',
      },
      {
        fromUserId: admin.id,
        toUserId: usman.id,
        committeeId: gulshan.id,
        rating: 3,
        comment: 'Kabhi delay ho jata hai — savdhani se.',
      },
    ],
  });

  const memberIds = [sara.id, bilal.id, zara.id, usman.id, fatima.id, kamran.id];
  for (const uid of memberIds) {
    await evaluateBadges(uid);
  }

  await upsertBadgeGrant(sara.id, 'Wafadaar Saathi');
  await upsertBadgeGrant(sara.id, 'Bharosemand');
  await upsertBadgeGrant(fatima.id, 'Bharosemand');
  await upsertBadgeGrant(fatima.id, 'Amanatdaar');
  await upsertBadgeGrant(usman.id, 'Tawajju Darkaar');
  await upsertBadgeGrant(kamran.id, 'Sargaram');
  await upsertBadgeGrant(zara.id, 'Naya Rukn');
  await upsertBadgeGrant(bilal.id, 'Amanatdaar');

  for (const uid of memberIds) {
    await persistTrustScore(uid);
  }

  console.log('──────────────────────────────────────────────');
  console.log('Amanat seed complete. Password:', DEMO_PW);
  console.log('  Admin:   admin@amanat.demo');
  console.log('  Members: sara, bilal, zara, usman, fatima, kamran @amanat.demo');
  console.log('──────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
