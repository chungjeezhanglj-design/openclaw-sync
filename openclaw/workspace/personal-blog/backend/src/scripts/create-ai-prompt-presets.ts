import 'dotenv/config';
import { AppDataSource } from '../config/data-source';
import { config } from 'dotenv';

config();

async function migrate() {
  console.log('=== 创建 AI 提示词预设表 ===\n');

  try {
    await AppDataSource.initialize();
    console.log('数据库连接成功');

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_prompt_presets (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL COMMENT '预设名称',
        description VARCHAR(255) COMMENT '预设描述',
        prompt TEXT NOT NULL COMMENT '提示词内容',
        is_default TINYINT(1) DEFAULT 0 COMMENT '是否为默认预设',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ 创建表 ai_prompt_presets');

    const existing = await queryRunner.query('SELECT COUNT(*) as count FROM ai_prompt_presets');
    if (existing[0].count === 0) {
      const presets = [
        {
          id: '1',
          name: '通用图片分析',
          description: '适用于风景、人物、日常照片等通用场景',
          prompt: '请详细分析这张图片，描述：\n1. 图片中的主要内容和元素\n2. 画面风格、色彩和构图\n3. 整体氛围和意图\n\n返回JSON格式：{"title":"标题","caption":"描述","tags":["标签"],"scene":"场景","mood":"氛围"}',
          is_default: 1
        },
        {
          id: '2',
          name: '产品图片',
          description: '适用于电商产品、产品展示图片',
          prompt: '分析这张产品图片：\n1. 产品外观和主要特征\n2. 材质、工艺、颜色等细节\n3. 使用场景或摆放方式\n4. 可能的目标用户群体\n\n返回JSON格式：{"title":"标题","caption":"描述","tags":["标签"],"scene":"场景","mood":"氛围"}',
          is_default: 0
        },
        {
          id: '3',
          name: 'UI/截图分析',
          description: '适用于APP界面、网页截图分析',
          prompt: '分析这个界面截图：\n1. 页面类型和主要功能区域\n2. 识别所有 UI 元素（按钮、输入框、导航等）\n3. 分析布局和层级结构\n4. 识别任何问题或可改进之处\n\n返回JSON格式：{"title":"标题","caption":"描述","tags":["标签"],"scene":"场景","mood":"氛围"}',
          is_default: 0
        },
        {
          id: '4',
          name: '图表数据分析',
          description: '适用于柱状图、折线图、饼图等图表',
          prompt: '这是一张图表，请分析：\n1. 图表类型和数据维度\n2. 主要趋势、模式或结论\n3. 关键数据点和异常值\n4. 数据来源（如果有）\n\n返回JSON格式：{"title":"标题","caption":"描述","tags":["标签"],"scene":"场景","mood":"氛围"}',
          is_default: 0
        },
        {
          id: '5',
          name: '文档扫描识别',
          description: '适用于文档、名片、发票等扫描件',
          prompt: '识别并提取这张图片中的信息：\n1. 所有文字内容（OCR）\n2. 文档结构（标题、段落、表格等）\n3. 关键信息提取\n4. 文档类型判断\n\n返回JSON格式：{"title":"标题","caption":"描述","tags":["标签"],"scene":"场景","mood":"氛围"}',
          is_default: 0
        }
      ];

      for (const preset of presets) {
        await queryRunner.query(
          'INSERT INTO ai_prompt_presets (id, name, description, prompt, is_default) VALUES (?, ?, ?, ?, ?)',
          [preset.id, preset.name, preset.description, preset.prompt, preset.is_default]
        );
        console.log(`✓ 添加预设: ${preset.name}`);
      }
    } else {
      console.log('- 预设已存在，跳过添加');
    }

    await queryRunner.release();
    console.log('\n迁移完成！');
    await AppDataSource.destroy();
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

migrate();
