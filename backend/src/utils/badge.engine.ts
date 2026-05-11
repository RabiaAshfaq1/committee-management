import prisma from '../prisma/client';
import { persistTrustScore } from './trust.score';

const BADGE_NAMES = {
  amanatdaar: 'Amanatdaar',
  wafadaarSaathi: 'Wafadaar Saathi',
  nayaRukn: 'Naya Rukn',
  bharosemand: 'Bharosemand',
  sargaram: 'Sargaram',
  tawajjuDarkaar: 'Tawajju Darkaar',
} as const;

async function getBadgeIdByName(name: string): Promise<string | null> {
  const b = await prisma.badge.findFirst({ where: { name }, select: { id: true } });
  return b?.id ?? null;
}

async function ensureUserBadge(userId: string, badgeId: string): Promise<void> {
  await prisma.userBadge.upsert({
    where: { userId_badgeId: { userId, badgeId } },
    create: { userId, badgeId },
    update: {},
  });
}

async function removeUserBadge(userId: string, badgeId: string): Promise<void> {
  await prisma.userBadge.deleteMany({ where: { userId, badgeId } });
}

/** Missed = PENDING and round due passed */
async function missedPaymentCount(userId: string): Promise<number> {
  return prisma.payment.count({
    where: {
      userId,
      status: 'PENDING',
      round: {
        dueDate: { lt: new Date() },
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
    },
  });
}

/** Consecutive PAID rounds (simplified: count recent PAID in sequence from latest rounds) */
async function consecutivePaidStreak(userId: string): Promise<number> {
  const payments = await prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: { round: { select: { roundNumber: true, status: true } } },
  });
  let streak = 0;
  for (const p of payments) {
    if (p.status === 'PAID') streak += 1;
    else break;
  }
  return streak;
}

export async function evaluateBadges(userId: string): Promise<void> {
  const ids = {
    amanatdaar: await getBadgeIdByName(BADGE_NAMES.amanatdaar),
    wafadaarSaathi: await getBadgeIdByName(BADGE_NAMES.wafadaarSaathi),
    nayaRukn: await getBadgeIdByName(BADGE_NAMES.nayaRukn),
    bharosemand: await getBadgeIdByName(BADGE_NAMES.bharosemand),
    sargaram: await getBadgeIdByName(BADGE_NAMES.sargaram),
    tawajjuDarkaar: await getBadgeIdByName(BADGE_NAMES.tawajjuDarkaar),
  };

  const [
    committeesJoined,
    committeesCompleted,
    totalPayments,
    paidPayments,
    activeCommittees,
    missed,
    streak,
  ] = await Promise.all([
    prisma.committeeMember.count({ where: { userId } }),
    prisma.committeeMember.count({ where: { userId, committee: { status: 'COMPLETED' } } }),
    prisma.payment.count({ where: { userId } }),
    prisma.payment.count({ where: { userId, status: 'PAID' } }),
    prisma.committeeMember.count({ where: { userId, committee: { status: 'ACTIVE' } } }),
    missedPaymentCount(userId),
    consecutivePaidStreak(userId),
  ]);

  const paymentRate = totalPayments === 0 ? 1 : paidPayments / totalPayments;

  if (ids.nayaRukn && committeesJoined >= 1) await ensureUserBadge(userId, ids.nayaRukn);
  if (ids.wafadaarSaathi && committeesCompleted >= 3) await ensureUserBadge(userId, ids.wafadaarSaathi);
  if (ids.sargaram && activeCommittees >= 3) await ensureUserBadge(userId, ids.sargaram);
  if (ids.amanatdaar && streak >= 5) await ensureUserBadge(userId, ids.amanatdaar);
  if (ids.bharosemand) {
    if (totalPayments > 0 && paymentRate >= 1) await ensureUserBadge(userId, ids.bharosemand);
    else if (totalPayments > 0 && paymentRate < 1) await removeUserBadge(userId, ids.bharosemand);
  }

  if (ids.tawajjuDarkaar) {
    if (missed >= 2) await ensureUserBadge(userId, ids.tawajjuDarkaar);
    else await removeUserBadge(userId, ids.tawajjuDarkaar);
  }

  await persistTrustScore(userId);
}
