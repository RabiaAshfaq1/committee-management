/** Platform moderator (JWT role ADMIN — not committee organizer). */
export function isPlatformAdmin(role: string | undefined): boolean {
  return role === 'ADMIN';
}

/** Committee organizer OR platform moderator (full manage rights on that committee). */
export function canManageCommittee(userId: string, userRole: string | undefined, committeeOrganizerId: string): boolean {
  if (isPlatformAdmin(userRole)) return true;
  return committeeOrganizerId === userId;
}
