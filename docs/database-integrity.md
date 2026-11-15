# MySQL cascade integrity — resolved locally, 2026-11-15

The installed LabCheck MySQL server now passes the original nested-cascade regression and the full API/integrity suite. The fix was a persistent server configuration change and restart, not a schema migration: `innodb_native_foreign_keys=ON`. Global and session `foreign_key_checks` stayed **ON**. No academic constraint, trigger, or record was removed or modified.

## Cause and isolation

The affected server is **MySQL 26.7.0**, previously using its default SQL-runtime FK implementation (`innodb_native_foreign_keys=OFF`, `enable_cascade_triggers=OFF`). Before repair, the original test again left a second-midterm lab referencing a deleted midterm after deleting its offering. See [before-repair failure](../outputs/verification/cascade-before.log).

The minimal disposable schema reproduces the defect without application code:

```
parent -> composite midterm -> lab -> result
       -> enrollment -------------> result
```

The simple parent/midterm/lab chain passes. Adding the converging enrollment/result path fails even when those two tables are empty. Lab distributions 1/1, 4/1, 1/4 and 4/4 reproduce it. Removing delete triggers, then all triggers, does not repair the full-schema case; adding an experimental direct offering-to-lab FK also does not repair it. Those experiments occurred only in disposable databases and are not migrations.

The **same server binary and unchanged application schema pass with native InnoDB FK handling enabled**. This isolates the regression to the version's runtime FK implementation, selected by configuration. There is no evidence that the application schema is invalid or that disabled checks, lock triggers, or missing application cleanup caused it. The exact faulty server source line and the behavior of other MySQL versions were not established.

[MySQL's variable reference](https://dev.mysql.com/doc/refman/26.7/en/innodb-parameters.html#sysvar_innodb_native_foreign_keys) identifies this as a global, startup-only switch between runtime and native engine handling. The option is deprecated in this release; future upgrades must rerun the regression rather than assume the switch remains available. [Verified bug 120251](https://bugs.mysql.com/bug.php?id=120251) reports related runtime-FK failures, but is not proof that this converging DELETE case is the identical upstream defect.

## Repair actually applied

1. Confirmed the local server contained only LabCheck and MySQL system databases, with no other application connections.
2. Created a private `mysqldump` backup (85,839 bytes) under `/private/tmp/labcheck-cascade-backup-qoNmzq/labcheck.sql`, directory mode 0700 and file mode 0600. This is a local repair backup, not a production backup/recovery system.
3. Recorded row counts and SHA-256 hashes of all table contents and CREATE TABLE definitions, plus all trigger definitions.
4. Executed the following with the existing authorized operator connection:

```sql
SET PERSIST_ONLY innodb_native_foreign_keys = ON;
RESTART;
```

MySQL persisted the setting in its data-directory `mysqld-auto.cnf`; the existing `mysqld_safe` supervisor restarted the server. [MySQL documents this use of PERSIST_ONLY and RESTART](https://dev.mysql.com/doc/refman/26.7/en/restart.html). Application migrations do not execute either operation.

5. Verified the restarted server reports native mode ON and both global/session FK checks ON. All **26 table data/schema hashes and all 19 triggers are unchanged**. Snapshots: [before](../outputs/verification/database-before.json), [after](../outputs/verification/database-after.json).
6. Ran the complete suites on this repaired server using disposable schemas. No test used the real academic records as fixtures. The final read-only audit reports **36 foreign keys, zero orphans**, and confirms `lab_change_requests_enrollment_fk ON DELETE RESTRICT`.

For another deployment, take its own backup, assess active clients and downtime, apply the setting through its database operator, then run the commands below. Do not copy an old server's `mysqld-auto.cnf` into another installation. Reverting to runtime mode on this version reintroduces the demonstrated defect and is not an acceptable production rollback.

## Regression and deployment checks

```sh
npm run db:check
npm run test:db
npm run test:e2e
```

`db:check` is read-only: it validates FK settings, checks every simple/composite FK for orphan rows, and verifies the request-history RESTRICT constraint. It never disables checks. The normal API entry point now refuses startup when FK checks are off or the runtime FK switch is OFF. Older MySQL versions without the switch still require the full regression suite; the configuration check alone cannot prove engine correctness.

The original offering-deletion test remains unchanged. `converging-cascades.integration.test.js` adds **eight matrix scenarios**, with empty and populated converging branches. Populated scenarios also verify that a RESTRICT-protected child rejects parent deletion and rolls back every partially visited branch before a subsequent permitted cascade deletes all children.

The `:native` test commands remain available for an entirely separate temporary server. They are no longer necessary to make the configured local server pass. [Current complete results](verification-report.md).

## Academic protections and readiness

No offering-delete API was introduced. Account and catalog deletes continue to refuse protected histories/dependencies. Locked assessments remain read-only. No FK action, lock rule, placement rule, or existing academic row changed during this repair.

The local database-integrity blocker is resolved. Production SMTP/deliverability, HTTPS/Secure cookies, approved institutional data, least-privilege credentials, durable storage/backups, recovery/load/failover checks, and multi-instance rate-limit storage still require deployment validation. Passing local integrity and browser tests does not establish production readiness.
