import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import fs from 'fs';
import path from 'path';

config();

const SETUP_COMPLETE_FILE = path.join(__dirname, '../../.setup-complete');
const ENV_FILE = path.join(__dirname, '../../.env');

export const adminConfig = {
  email: process.env.ADMIN_EMAIL || '',
  password: process.env.ADMIN_PASSWORD || '',
};

export function isConfigured(): boolean {
  return !!(process.env.DB_HOST && process.env.DB_DATABASE);
}

export function isSetupComplete(): boolean {
  return fs.existsSync(SETUP_COMPLETE_FILE);
}

export function markSetupComplete(): void {
  fs.writeFileSync(SETUP_COMPLETE_FILE, new Date().toISOString());
}

export function isDatabaseReady(dataSource: DataSource | null): boolean {
  return dataSource?.isInitialized || false;
}

export function validateProductionEnv(): void {
  // 仅在生产环境强制: 未设 ADMIN_EMAIL / ADMIN_PASSWORD / JWT_SECRET 直接拒绝启动
  if (process.env.NODE_ENV !== 'production') return;

  const required: Array<[string, string]> = [
    ['ADMIN_EMAIL', adminConfig.email],
    ['ADMIN_PASSWORD', adminConfig.password],
    ['JWT_SECRET', process.env.JWT_SECRET || ''],
    ['JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET || ''],
  ];

  const missing = required
    .filter(([_, value]) => !value || value === 'your-production-jwt-secret' || value === 'admin123')
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error('');
    console.error('🚨 启动被拦截: 以下生产环境必填变量未设置或为占位符:');
    for (const key of missing) {
      console.error(`   - ${key}`);
    }
    console.error('');
    console.error('请编辑 .env 后重启。参考 backend/.env.production.example。');
    process.exit(1);
  }
}

export function updateEnvConfig(updates: Record<string, string>): void {
  let envContent = fs.readFileSync(ENV_FILE, 'utf-8');
  
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }
  
  fs.writeFileSync(ENV_FILE, envContent);
  
  for (const [key, value] of Object.entries(updates)) {
    process.env[key] = value;
  }
}
