/**
 * 全局测试 setup
 * - 设置测试环境变量
 * - 准备 fetch mock 桩
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-do-not-use-in-prod';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-testing-only';
process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
process.env.OLLAMA_MODEL = 'test-ollama-model';

// 给 .env / .env.local 兜底,防止某些模块读真实密钥
process.env.AMAP_KEY = process.env.AMAP_KEY || '';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.DB_USERNAME = process.env.DB_USERNAME || 'test';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test';
process.env.DB_DATABASE = process.env.DB_DATABASE || 'personal_blog_test';
