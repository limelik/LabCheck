import 'dotenv/config';

export const config = {
  port: Number(process.env.API_PORT || 3001),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'labcheck',
    waitForConnections: true,
    connectionLimit: 10,
    timezone: 'Z',
    decimalNumbers: true,
  },
  authSecret: process.env.AUTH_SECRET,
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM,
  },
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:5173',
};
