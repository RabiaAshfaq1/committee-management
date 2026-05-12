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
  try {
    const legacy = await prisma.badge.findMany({
      where: { name: { in: [...LEGACY_BADGE_NAMES] } },
      select: { id: true },
    });
    const legacyIds = legacy.map((b) => b.id);
    if (!legacyIds.length) return;
    await prisma.userBadge.deleteMany({ where: { badgeId: { in: legacyIds } } });
    await prisma.badge.deleteMany({ where: { id: { in: legacyIds } } });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === 'P2021') return;
    throw e;
  }
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
      name: 'Rabia Ashfaq',
      email: 'rabia@amanat.demo',
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
      durationMonths: 6,
      turnMethod: 'MANUAL',
      status: 'ACTIVE',
      adminId: admin.id,
    },
  });

  const shareG = gulshan.monthlyAmount / 6;
  const gMembers = [
    { user: sara, turn: 1 },
    { user: bilal, turn: 2 },
    { user: fatima, turn: 3 },
    { user: zara, turn: 4 },
    { user: kamran, turn: 5 },
    { user: usman, turn: 6 },
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
  const overdueDue = ago(21);

  let gulshanRound3Id = '';
  let gulshanRound4Id = '';
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
    if (rn === 3) gulshanRound3Id = r.id;
    if (rn === 4) gulshanRound4Id = r.id;
    for (const m of gMembers) {
      await prisma.payment.create({
        data: {
          roundId: r.id,
          memberId: cmByUser(m.user.id),
          userId: m.user.id,
          amount: shareG,
          status: 'PAID',
          transactionId: `pay-${rn}-${m.user.id.slice(0, 6)}`,
          paidAt: pastDue,
          dueDate: pastDue,
        },
      });
    }
  }

  const r5 = await prisma.round.create({
    data: {
      committeeId: gulshan.id,
      roundNumber: 5,
      payoutUserId: kamran.id,
      status: 'ACTIVE',
      dueDate: activeDue,
    },
  });
  const paySpec: Record<string, { paid: boolean; txn?: string }> = {
    [sara.id]: { paid: true, txn: 'TXN-001' },
    [bilal.id]: { paid: true, txn: 'TXN-002' },
    [fatima.id]: { paid: true, txn: 'TXN-003' },
    [zara.id]: { paid: false },
    [usman.id]: { paid: false },
    [kamran.id]: { paid: true, txn: 'TXN-004' },
  };
  for (const m of gMembers) {
    const spec = paySpec[m.user.id];
    const pend = !spec.paid;
    await prisma.payment.create({
      data: {
        roundId: r5.id,
        memberId: cmByUser(m.user.id),
        userId: m.user.id,
        amount: shareG,
        status: pend ? 'PENDING' : 'PAID',
        transactionId: spec.txn ?? null,
        paidAt: pend ? null : new Date(),
        dueDate: pend && (m.user.id === usman.id || m.user.id === zara.id) ? overdueDue : activeDue,
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
      durationMonths: 4,
      turnMethod: 'MANUAL',
      status: 'ACTIVE',
      adminId: sara.id,
    },
  });
  const shareD = defence.monthlyAmount / 4;
  const dMembers = [
    { user: sara, turn: 1 },
    { user: fatima, turn: 2 },
    { user: kamran, turn: 3 },
    { user: bilal, turn: 4 },
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

  let defenceRound1Id = '';
  let defenceRound2Id = '';
  for (let rn = 1; rn <= 2; rn++) {
    const payoutUserId = rn === 1 ? sara.id : fatima.id;
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
    if (rn === 1) defenceRound1Id = r.id;
    if (rn === 2) defenceRound2Id = r.id;
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

  const dr3 = await prisma.round.create({
    data: {
      committeeId: defence.id,
      roundNumber: 3,
      payoutUserId: kamran.id,
      status: 'ACTIVE',
      dueDate: activeDue,
    },
  });
  const dPay3: Record<string, { paid: boolean; txn?: string }> = {
    [sara.id]: { paid: true, txn: 'TXN-005' },
    [fatima.id]: { paid: true, txn: 'TXN-006' },
    [kamran.id]: { paid: false },
    [bilal.id]: { paid: true, txn: 'TXN-007' },
  };
  for (const m of dMembers) {
    const spec = dPay3[m.user.id];
    const pend = !spec.paid;
    await prisma.payment.create({
      data: {
        roundId: dr3.id,
        memberId: dcmByUser(m.user.id),
        userId: m.user.id,
        amount: shareD,
        status: pend ? 'PENDING' : 'PAID',
        transactionId: spec.txn ?? null,
        paidAt: pend ? null : new Date(),
        dueDate: activeDue,
      },
    });
  }

  const johar = await prisma.committee.create({
    data: {
      name: 'Johar Town Circle',
      description: 'Local rotating circle — Johar Town chapter.',
      totalSlots: 4,
      monthlyAmount: 5000,
      startDate: ago(60),
      durationMonths: 4,
      turnMethod: 'MANUAL',
      status: 'ACTIVE',
      adminId: kamran.id,
    },
  });
  const shareJ = johar.monthlyAmount / 4;
  const jMembers = [
    { user: kamran, turn: 1 },
    { user: zara, turn: 2 },
    { user: usman, turn: 3 },
    { user: bilal, turn: 4 },
  ];
  const jCm: { id: string; userId: string }[] = [];
  for (const { user, turn } of jMembers) {
    const row = await prisma.committeeMember.create({
      data: {
        userId: user.id,
        committeeId: johar.id,
        turnNumber: turn,
        shareCount: 1,
        shareAmount: shareJ,
      },
    });
    jCm.push({ id: row.id, userId: user.id });
  }
  const jcmByUser = (uid: string) => jCm.find((x) => x.userId === uid)!.id;

  const jr1 = await prisma.round.create({
    data: {
      committeeId: johar.id,
      roundNumber: 1,
      payoutUserId: kamran.id,
      status: 'COMPLETED',
      dueDate: pastDue,
      recipientTransactionId: 'TX-J-1',
    },
  });
  for (const m of jMembers) {
    await prisma.payment.create({
      data: {
        roundId: jr1.id,
        memberId: jcmByUser(m.user.id),
        userId: m.user.id,
        amount: shareJ,
        status: 'PAID',
        transactionId: `j1-${m.user.id.slice(0, 6)}`,
        paidAt: pastDue,
        dueDate: pastDue,
      },
    });
  }

  const jr2 = await prisma.round.create({
    data: {
      committeeId: johar.id,
      roundNumber: 2,
      payoutUserId: zara.id,
      status: 'ACTIVE',
      dueDate: activeDue,
    },
  });
  const jPay2: Record<string, { paid: boolean; txn?: string }> = {
    [kamran.id]: { paid: true, txn: 'j2-k' },
    [zara.id]: { paid: true, txn: 'j2-z' },
    [usman.id]: { paid: false },
    [bilal.id]: { paid: true, txn: 'j2-b' },
  };
  for (const m of jMembers) {
    const spec = jPay2[m.user.id];
    const pend = !spec.paid;
    await prisma.payment.create({
      data: {
        roundId: jr2.id,
        memberId: jcmByUser(m.user.id),
        userId: m.user.id,
        amount: shareJ,
        status: pend ? 'PENDING' : 'PAID',
        transactionId: spec.txn ?? null,
        paidAt: pend ? null : new Date(),
        dueDate: pend && m.user.id === usman.id ? overdueDue : activeDue,
      },
    });
  }

  await prisma.feedback.createMany({
    data: [
      {
        fromUserId: sara.id,
        toUserId: bilal.id,
        committeeId: gulshan.id,
        roundId: gulshanRound4Id,
        rating: 4,
        comment: 'Always pays on time, trustworthy member',
      },
      {
        fromUserId: fatima.id,
        toUserId: sara.id,
        committeeId: defence.id,
        roundId: defenceRound2Id,
        rating: 5,
        comment: 'Excellent organizer, very reliable',
      },
      {
        fromUserId: admin.id,
        toUserId: usman.id,
        committeeId: gulshan.id,
        roundId: gulshanRound3Id,
        rating: 2,
        comment: 'Late on multiple payments, needs improvement',
      },
      {
        fromUserId: bilal.id,
        toUserId: fatima.id,
        committeeId: gulshan.id,
        roundId: gulshanRound4Id,
        rating: 5,
        comment: 'Perfect record, highly recommend',
      },
      {
        fromUserId: kamran.id,
        toUserId: zara.id,
        committeeId: johar.id,
        roundId: jr1.id,
        rating: 3,
        comment: 'New member, still learning the process',
      },
      {
        fromUserId: sara.id,
        toUserId: kamran.id,
        committeeId: defence.id,
        roundId: defenceRound1Id,
        rating: 4,
        comment: 'Good member, active in multiple committees',
      },
    ],
  });

  const memberIds = [admin.id, sara.id, bilal.id, zara.id, usman.id, fatima.id, kamran.id];
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
  console.log('  Admin:   rabia@amanat.demo');
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
