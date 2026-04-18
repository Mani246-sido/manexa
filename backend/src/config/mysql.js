import mysql from 'mysql2/promise';
export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,

    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
  connectionLimit: 10,   // max connections
  queueLimit: 0
}); 
export const connectmysql = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL Connected');
    connection.release();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

