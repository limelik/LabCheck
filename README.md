# LabCheck

LabCheck is a university lab management app for students, teachers, department admins, and super admins.

## Frontend

The current app is a React + Vite frontend with mock data under [`src/data`](./src/data).

```bash
npm install
npm run dev
```

## Database

A normalized database schema for the university workflow lives in:

- PostgreSQL: [`database/schema.sql`](./database/schema.sql) and [`database/seed.sql`](./database/seed.sql)
- MySQL 8.0: [`database/schema.mysql.sql`](./database/schema.mysql.sql) and [`database/seed.mysql.sql`](./database/seed.mysql.sql)

Design notes live in [`database/README.md`](./database/README.md).

The schema supports:

- `@polytechnic.am` account validation
- role-based access for super admins, department admins, teachers, and students
- departments owning subjects
- groups and subgroups independent from departments
- teacher assignment by subject offering and subgroup
- student subgroup membership per subject
- shared labs across multiple subgroups
- attendance, grades, eligibility, and final score reporting
