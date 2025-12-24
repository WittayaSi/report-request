import mysql from "mysql2/promise";

// Connection pool สำหรับ External MySQL (Authentication)
export const externalAuthPool = mysql.createPool({
  host: process.env.MYSQL_AUTH_HOST,
  port: Number(process.env.MYSQL_AUTH_PORT) || 3306,
  user: process.env.MYSQL_AUTH_USER,
  password: process.env.MYSQL_AUTH_PASSWORD,
  database: process.env.MYSQL_AUTH_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
