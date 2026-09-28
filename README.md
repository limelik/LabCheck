# LabCheck

LabCheck is a university lab management app for students, teachers, academic-unit admins, and super admins.

## Front end

The React + Vite front end currently uses example data under `src/data` and in-memory state. Run it with `npm install` and `npm run dev`. Check it with `npm run lint` and `npm run build`.

## Database

MySQL is the active database. The schema is [`database/schema.mysql.sql`](./database/schema.mysql.sql), the demo data is [`database/seed.mysql.sql`](./database/seed.mysql.sql), and the current business rules are in [`database/README.md`](./database/README.md). Other SQL dialect files are historical.

The front end does not yet call a backend, so its login, signup, grading, and placement changes are prototypes until the API is implemented.
