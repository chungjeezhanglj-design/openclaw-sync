import mysql from 'mysql2/promise';
import 'dotenv/config';

async function testConnection() {
  console.log('尝试连接数据库...');
  console.log('主机:', process.env.DB_HOST);
  console.log('用户名:', process.env.DB_USERNAME);
  console.log('数据库:', process.env.DB_DATABASE);
  console.log('密码长度:', process.env.DB_PASSWORD?.length);
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });
    
    console.log('✅ 数据库连接成功！');
    
    const [rows] = await connection.query('SELECT NOW() as time');
    console.log('服务器时间:', (rows as any)[0].time);
    
    await connection.end();
  } catch (error: any) {
    console.error('❌ 连接失败:');
    console.error('错误代码:', error.code);
    console.error('错误消息:', error.message);
  }
}

testConnection();
