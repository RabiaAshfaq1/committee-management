import prisma from '../prisma/client';

export interface TrustScoreBreakdown {
  score: number;
  paymentPoints: number;
  feedbackPoints: number;
  committeesPoints: number;
  agePoints: number;
}

/** 0–100: payment 40, feedback 30, completed committees 20, account age 10 */
export async function calculateTrustScore(userId: string): Promise<TrustScoreBreakdown> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });
  if (!user) {
    return { score: 0, paymentPoints: 0, feedbackPoints: 0, committeesPoints: 0, agePoints: 0 };
  }

  const [paidCount, totalPayments, ratingAgg, completedCommittees] = await Promise.all([
    prisma.payment.count({ where: { userId, status: 'PAID' } }),
    prisma.payment.count({ where: { userId } }),
    prisma.feedback.aggregate({
      where: { toUserId: userId },
      _avg: { rating: true },
    }),
    prisma.committeeMember.count({
      where: { userId, committee: { status: 'COMPLETED' } },
    }),
  ]);

  const avgRating = ratingAgg._avg.rating ?? 0;

  const paymentRate = totalPayments === 0 ? 1 : paidCount / totalPayments;
  const paymentPoints = Math.round(Math.min(40, paymentRate * 40));

  const feedbackPoints = Math.round(Math.min(30, (avgRating / 5) * 30));

  const committeesPoints = Math.min(20, completedCommittees * 4);

  const ageMonths = Math.max(
    0,
    (Date.now() - new Date(user.createdAt).getTime()) / (30.44 * 24 * 3600 * 1000),
  );
  const agePoints = Math.min(10, Math.floor(ageMonths));

  const score = Math.min(100, paymentPoints + feedbackPoints + committeesPoints + agePoints);

  return {
    score,
    paymentPoints,
    feedbackPoints,
    committeesPoints,
    agePoints,
  };
}

/** Persists latest trust score on `User.trustScore` (call after payments, rounds, feedback, badges). */
export async function persistTrustScore(userId: string): Promise<TrustScoreBreakdown> {
  const breakdown = await calculateTrustScore(userId);
  await prisma.user.update({
    where: { id: userId },
    data: { trustScore: breakdown.score },
  });
  return breakdown;
}
