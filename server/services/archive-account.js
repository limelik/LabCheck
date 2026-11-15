import { ApiError } from "../http.js";
// Keep profile IDs and academic foreign keys intact while releasing the login email.
export async function archiveAccount(c, account, actorId) {
  if (account.role === "ADMIN")
    throw new ApiError(
      409,
      "ADMIN_PROTECTED",
      "Administrator accounts cannot be archived.",
    );
  if (!account.email)
    throw new ApiError(
      409,
      "ALREADY_ARCHIVED",
      "This login has already been deleted.",
    );
  await c.execute("DELETE FROM auth_sessions WHERE user_account_id=?", [
    account.id,
  ]);
  await c.execute("DELETE FROM email_otp_challenges WHERE email=?", [
    account.email,
  ]);
  await c.execute("DELETE FROM registrations WHERE email=?", [account.email]);
  await c.execute(
    "UPDATE user_accounts SET email=NULL,password_hash='',is_active=FALSE,email_verified_at=NULL,archived_at=UTC_TIMESTAMP() WHERE id=?",
    [account.id],
  );
  await c.execute(
    "INSERT INTO account_audit(actor_id,target_id,action,details) VALUES (?,?,?,?)",
    [
      actorId,
      account.id,
      "ARCHIVE",
      "Login deleted; academic history retained; email released for registration.",
    ],
  );
}
