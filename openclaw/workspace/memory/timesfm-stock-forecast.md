# 📈 TimesFM 股票预测实战指南

**创建时间**: 2026-04-08  
**模型**: Google TimesFM 2.5 (200M 参数)  
**用途**: 零样本股票价格/收益率预测

---

## 📦 安装依赖

```bash
# 进入工作目录
cd ~/.openclaw/timesfm-stock

# 创建虚拟环境
uv venv
source .venv/bin/activate

# 安装核心依赖
uv pip install timesfm[torch] pandas numpy

# 可选：真实股票数据 + 可视化
uv pip install yfinance matplotlib
```

---

## 🚀 快速开始

### 方案 A：基础版（模拟数据）

```bash
cd ~/.openclaw/timesfm-stock
python stock_forecast.py
```

**输出示例**:
```
📈 TimesFM 股票预测报告
============================================================
当前价格：¥112.34
预测周期：10 天
------------------------------------------------------------
第 1 天：¥  113.45  ( +0.99%)  [111.20 - 115.70]
第 2 天：¥  114.12  ( +1.58%)  [110.85 - 117.40]
...
预测趋势：📈 上涨 (+2.34%)
不确定性：¥5.67 (90% 置信区间)
```

---

### 方案 B：专业版（真实股票数据）

```bash
cd ~/.openclaw/timesfm-stock
python stock_forecast_pro.py
```

**支持股票**:
- 美股：`AAPL`, `GOOGL`, `MSFT`, `TSLA`, `NVDA`, ...
- A 股：`600519.SS` (贵州茅台), `000858.SZ` (五粮液), ...
- 港股：`0700.HK` (腾讯), `9988.HK` (阿里), ...

**修改股票列表** (编辑 `stock_forecast_pro.py`):
```python
STOCKS = [
    'AAPL',      # 苹果
    '600519.SS', # 贵州茅台
    '0700.HK',   # 腾讯控股
]
```

---

## 📊 输出文件

| 文件 | 说明 |
|------|------|
| `stock_forecast_result.csv` | 基础版预测结果 |
| `stock_reports.json` | 专业版 JSON 报告 |
| `*_forecast.png` | 可视化图表 (可选) |

---

## 🔍 预测原理

### 1. 数据预处理
```
原始价格 → 计算收益率 → 标准化 → TimesFM 输入
```

**为什么用收益率而不是价格？**
- 收益率更平稳（stationary）
- 消除价格量级影响
- 模型更容易学习模式

### 2. TimesFM 预测
```
输入：过去 60 天收益率
输出：未来 N 天收益率预测 + 分位数置信区间
```

### 3. 转换回价格
```
预测收益率 → 累计相乘 → 预测价格
```

---

## 📈 技术指标（专业版）

专业版脚本自动计算：

| 指标 | 说明 |
|------|------|
| MA5/MA20/MA60 | 5/20/60 日移动平均线 |
| RSI | 相对强弱指标 (超买>70, 超卖<30) |
| MACD | 趋势动量指标 |
| 布林带 | 波动率通道 (±2 标准差) |

---

## ⚠️ 重要提示

### 模型局限性
- ✅ **零样本预测**：无需训练，直接用预训练模型
- ✅ **概率预测**：提供 90% 置信区间
- ⚠️ **仅基于历史数据**：不考虑新闻、财报、政策等外部因素
- ⚠️ **短期预测更准确**：建议预测周期 ≤ 30 天

### 风险提示
```
⚠️ 本预测仅供学习/研究使用，不构成投资建议
⚠️ 股市有风险，投资需谨慎
⚠️ 建议结合基本面、技术面、消息面综合分析
```

---

## 🔧 故障排除

### 问题 1：模型下载失败
```bash
# 检查网络连接
ping huggingface.co

# 手动下载模型
git lfs install
git clone https://huggingface.co/google/timesfm-2.5-200m-pytorch
```

### 问题 2：内存不足
```bash
# 检查系统要求
python scripts/check_system.py

# 减少上下文长度
# 编辑脚本：lookback=30 (默认 60)
```

### 问题 3：yfinance 获取数据失败
```bash
# 检查股票代码格式
# 美股：AAPL, GOOGL
# A 股：600519.SS (上海), 000858.SZ (深圳)
# 港股：0700.HK

# 使用备用数据源（如 AKShare）
pip install akshare
```

---

## 📚 参考资源

- TimesFM GitHub: https://github.com/google-research/timesfm
- TimesFM 论文：https://arxiv.org/abs/2310.10688
- HuggingFace 模型：https://huggingface.co/collections/google/timesfm-release-66e4be5fdb56e960c1e482a6
- yfinance 文档：https://pypi.org/project/yfinance/

---

## 💡 进阶用法

### 批量预测多个股票
```python
STOCKS = ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA']
for symbol in STOCKS:
    forecast_stock(symbol)
```

### 自定义预测周期
```python
HORIZON = 30  # 预测 30 天 (默认 10)
```

### 导出可视化图表
```python
plot_forecast(symbol, df, forecast, save_path=f'{symbol}_forecast.png')
```

---

_最后更新：2026-04-08_
