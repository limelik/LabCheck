import { ApiError } from '../http.js';
export function assertRemovalAllowed(actorId, account, activeAdmins) {
  if (account.id === actorId)
    throw new ApiError(
      409,
      'SELF_PROTECTED',
      'You cannot deactivate or delete your own administrator account.',
    );
  if (
    account.role !== 'ADMIN' ||
    !account.isActive ||
    account.status !== 'APPROVED'
  )
    return;
  if (
    activeAdmins.length <= 1 ||
    (account.adminLevel === 'SUPER_ADMIN' &&
      activeAdmins.filter((a) => a.admin_level === 'SUPER_ADMIN').length <= 1)
  )
    throw new ApiError(
      409,
      'LAST_ADMIN',
      'The last active administrator or super administrator must be retained.',
    );
}
