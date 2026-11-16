-- Existing verified teachers no longer wait for administrator approval.
-- Explicitly rejected and disabled accounts remain blocked.
UPDATE user_accounts
SET approval_status = 'APPROVED'
WHERE account_type = 'TEACHER'
  AND approval_status = 'PENDING'
  AND email_verified_at IS NOT NULL
  AND is_active = TRUE;
