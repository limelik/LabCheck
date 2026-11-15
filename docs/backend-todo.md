# LabCheck status and remaining work

Implemented: six-digit SMTP OTP signup and recovery; trusted student/teacher identity matching; automatic email-group detection; deterministic cohort placement/reconciliation; database sessions/revocation; admin identity provisioning/review/account management/safe deletion; academic catalog CRUD; existing student/teacher assessments/locks/requests; private attachment upload/download/delete; isolated API and browser verification. The obsolete mock admin screens and deferred-attachment controls have been replaced.

## Required deployment work

1. **Verify each deployment's MySQL configuration.** The local blocker is resolved: the existing 26.7.0 server now uses persistent native FK handling and passes the original and expanded regressions. All academic records, schema definitions and triggers were preserved. API startup rejects unsafe FK settings; run `npm run db:check` and the complete suites against each target version/configuration before deployment or upgrade. See [database-integrity.md](database-integrity.md). No offering-delete API was added.
2. **Production email and HTTPS.** Supply real SMTP credentials/sender, TLS, HTTPS reverse proxy, Secure cookies and a protected stable secret. Real local SMTP delivery is verified; external delivery and deployed HTTPS are not.
3. **Institutional data.** Import/provision approved roster identities and real academic offerings/coverage. There is no external institutional roster feed in the repository. New student emails must identify existing academic groups; seed student addresses are legacy examples.
4. **Operations.** Use least-privilege runtime DB credentials, durable private storage, backups, maintenance scheduling, recovery testing and load testing. Rate-limit state requires a shared store for multiple API instances.

## Explicitly unsupported institutional policies

- Locked grades, attendance, exams and lab content remain read-only. There is no safe institutional correction/audit policy supplied for reopening results.
- A student with enrollment history cannot be moved to a different academic group by rewriting a profile. A formal transfer workflow needs institutional rules.
- Protected accounts are deactivated with history retained. Permanent deletion is available for eligible accounts; no retention period or anonymization rules were invented. Admin UI reports blocking dependencies.
- Registrations with an unrecognized/mismatched email group cannot be arbitrarily assigned. Correct the authoritative identity/email or configure an approved existing group before review approval.

These restrictions are visible errors/read-only states rather than silent no-op controls. See [verification-report.md](verification-report.md) for actual test results and limits.
