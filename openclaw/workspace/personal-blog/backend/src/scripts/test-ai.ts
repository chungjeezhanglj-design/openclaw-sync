import 'dotenv/config';
import { AppDataSource } from '../config/data-source';
import { Photo } from '../models/Photo';
import { AIServiceFactory } from '../services/ai/AIServiceFactory';
import { config } from 'dotenv';

config();

async function testAI() {
  console.log('=== 测试 AI 图片理解 ===');
  console.log('AI_PROVIDER:', process.env.AI_PROVIDER);
  console.log('MOONSHOT_API_KEY:', process.env.MOONSHOT_API_KEY ? '已配置' : '未配置');
  
  try {
    await AppDataSource.initialize();
    console.log('数据库连接成功');

    // 创建一个测试照片
    const photo = AppDataSource.getRepository(Photo).create({
      id: 'test-moon-' + Date.now(),
      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    });
    await AppDataSource.getRepository(Photo).save(photo);
    console.log('测试照片已创建:', photo.id);

    // 测试AI分析
    const aiService = AIServiceFactory.create(process.env.AI_PROVIDER || 'mock');
    const imageUrl = photo.url;
    
    console.log('\n正在调用 AI 分析...');
    console.log('使用的服务:', process.env.AI_PROVIDER || 'mock');
    
    const startTime = Date.now();
    const result = await aiService.analyze(imageUrl);
    const duration = Date.now() - startTime;
    
    console.log('\n✅ AI分析结果:');
    console.log('配文:', result.caption);
    console.log('标签:', result.tags);
    console.log('场景:', result.scene);
    console.log('氛围:', result.mood);
    console.log('置信度:', result.confidence);
    console.log('耗时:', duration + 'ms');
    
    await AppDataSource.destroy();
    console.log('\n测试完成！');
  } catch (error) {
    console.error('错误:', error);
    await AppDataSource.destroy();
  }
}

testAI();
