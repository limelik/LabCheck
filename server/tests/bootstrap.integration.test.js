import test from 'node:test';
import assert from 'node:assert/strict';
test(
  'first administrator provisioning requires an empty admin roster',
  { skip: process.env.RUN_DB_TESTS !== '1' },
  async (t) => {
    assert.equal(process.env.LABCHECK_ISOLATED_TEST, '1');
    const { pool } = await import('../db.js');
    const { bootstrapAdmin } = await import('../scripts/bootstrap-admin.js');
    t.after(() => pool.end());
    const c = await pool.getConnection();
    try {
      const [[count]] = await c.query('SELECT COUNT(*) AS n FROM admins');
      const input = {
        email: 'bootstrap@polytechnic.am',
        firstName: 'Bootstrap',
        lastName: 'Fixture',
      };
      if (!count.n) {
        const id = await bootstrapAdmin(c, input);
        const [[row]] = await c.execute(
          'SELECT * FROM user_accounts WHERE id=?',
          [id],
        );
        assert.equal(row.password_hash, 'demo-hash');
        assert.equal(row.email_verified_at, null);
        assert.equal(row.account_type, 'ADMIN');
      }
      await assert.rejects(
        bootstrapAdmin(c, input),
        (error) => error.code === 'ADMIN_EXISTS',
      );
    } finally {
      c.release();
    }
  },
);
