#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
汉朔科技 (301275.SZ) Hurst 指数分析
计算股价时间序列的 Hurst 指数，判断趋势延续性或均值回归特性
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime, timedelta

# 修复中文显示问题
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'STHeiti', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# ============== 方案 A: 使用 akshare 获取 A 股数据（推荐，免费） ==============
def fetch_stock_data_akshare(stock_code="301275", start_date="20240101", end_date=None):
    """
    使用 akshare 获取 A 股历史数据
    stock_code: 股票代码（不含后缀）
    """
    try:
        import akshare as ak
        if end_date is None:
            end_date = datetime.now().strftime("%Y%m%d")
        
        print(f"📡 正在从 akshare 获取 {stock_code} 的历史数据...")
        df = ak.stock_zh_a_hist(
            symbol=stock_code,
            period="daily",
            start_date=start_date,
            end_date=end_date,
            adjust="qfq"  # 前复权
        )
        return df
    except ImportError:
        print("⚠️ akshare 未安装，运行：pip install akshare")
        return None
    except Exception as e:
        print(f"❌ 获取数据失败：{e}")
        return None

# ============== 方案 B: 使用 yfinance（备用） ==============
def fetch_stock_data_yfinance(stock_code="301275.SZ", period="1y"):
    """
    使用 yfinance 获取股票数据（可能需要代理）
    """
    try:
        import yfinance as yf
        print(f"📡 正在从 yfinance 获取 {stock_code} 的历史数据...")
        df = yf.download(stock_code, period=period, progress=False)
        return df.reset_index()
    except Exception as e:
        print(f"❌ yfinance 获取失败：{e}")
        return None

# ============== Hurst 指数计算（核心算法） ==============
def compute_hurst_exponent(prices, max_lag=20):
    """
    使用 R/S 分析法计算 Hurst 指数
    
    参数:
        prices: 价格序列（numpy array 或 list）
        max_lag: 最大滞后阶数
    
    返回:
        H: Hurst 指数
        lags: 滞后数组
        rs_values: R/S 值数组
    """
    prices = np.array(prices)
    n = len(prices)
    lags = range(2, max_lag + 1)
    
    # 计算每个滞后阶数的 R/S 值
    rs_values = []
    for lag in lags:
        # 分段计算
        n_segments = n // lag
        if n_segments < 1:
            continue
            
        rs_sum = 0
        for i in range(n_segments):
            segment = prices[i * lag:(i + 1) * lag]
            
            # 去均值
            mean = np.mean(segment)
            deviations = segment - mean
            
            # 累计偏离
            cumulative = np.cumsum(deviations)
            
            # 极差 R
            R = np.max(cumulative) - np.min(cumulative)
            
            # 标准差 S
            S = np.std(segment)
            if S == 0:
                S = 1e-10
            
            rs_sum += R / S
        
        rs_values.append(rs_sum / n_segments)
    
    # 对 log(R/S) 和 log(lag) 进行线性拟合
    lags_array = np.array(list(lags))
    rs_array = np.array(rs_values)
    
    # 过滤掉无效值
    valid_mask = (rs_array > 0) & np.isfinite(rs_array)
    if np.sum(valid_mask) < 3:
        return 0.5, lags_array, rs_array
    
    log_lags = np.log(lags_array[valid_mask])
    log_rs = np.log(rs_array[valid_mask])
    
    # 线性回归：log(R/S) = H * log(lag) + C
    H, C = np.polyfit(log_lags, log_rs, 1)
    
    return H, lags_array, rs_array

# ============== 解读 Hurst 指数 ==============
def interpret_hurst(H):
    """解读 Hurst 指数"""
    if H > 0.55:
        strength = "强" if H > 0.7 else "中等"
        return f"📈 {strength}趋势延续型 (H={H:.4f})\n   建议：顺势而为，趋势跟踪策略"
    elif H < 0.45:
        strength = "强" if H < 0.3 else "中等"
        return f"📉 {strength}均值回归型 (H={H:.4f})\n   建议：高抛低吸，反转策略"
    else:
        return f"📊 随机游走型 (H={H:.4f})\n   建议：难以预测，谨慎操作"

# ============== 主函数 ==============
def main():
    print("=" * 60)
    print("🦎 汉朔科技 (301275.SZ) Hurst 指数分析")
    print("=" * 60)
    
    # 1. 获取数据（近三个月）
    from datetime import datetime, timedelta
    start_date = (datetime.now() - timedelta(days=90)).strftime("%Y%m%d")
    print(f"📅 分析时间范围：{start_date} 至今（近 3 个月）")
    df = fetch_stock_data_akshare(stock_code="301275", start_date=start_date)
    
    if df is None or df.empty:
        print("\n⚠️ 尝试使用模拟数据演示...")
        # 生成模拟数据（用于演示）
        np.random.seed(42)
        n_days = 250
        returns = np.random.randn(n_days) * 0.02
        prices = 100 * np.cumprod(1 + returns)
        dates = pd.date_range(end=datetime.now(), periods=n_days)
        df = pd.DataFrame({'日期': dates, '收盘': prices})
    else:
        print(f"✅ 成功获取 {len(df)} 个交易日数据")
    
    # 2. 提取收盘价
    close_prices = df['收盘'].values if '收盘' in df.columns else df['Close'].values
    
    # 3. 计算 Hurst 指数
    print("\n🔬 正在计算 Hurst 指数...")
    H, lags, rs_values = compute_hurst_exponent(close_prices, max_lag=30)
    
    # 4. 输出结果
    print("\n" + "=" * 60)
    print("📊 分析结果")
    print("=" * 60)
    print(f"\nHurst 指数 H = {H:.4f}")
    print(f"\n{interpret_hurst(H)}")
    
    # 5. 绘制图表
    print("\n📈 正在生成图表...")
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    
    # 图 1: 股价走势
    axes[0, 0].plot(close_prices, linewidth=1.5)
    axes[0, 0].set_title('汉朔科技 收盘价走势', fontsize=12, fontweight='bold')
    axes[0, 0].set_xlabel('交易日')
    axes[0, 0].set_ylabel('价格 (元)')
    axes[0, 0].grid(True, alpha=0.3)
    
    # 图 2: R/S 分析双对数图
    valid_mask = (np.array(rs_values) > 0) & np.isfinite(rs_values)
    if np.sum(valid_mask) > 2:
        axes[0, 1].scatter(np.log(np.array(list(range(2, len(rs_values)+2)))[valid_mask]), 
                          np.log(np.array(rs_values)[valid_mask]), 
                          alpha=0.6, label='实际数据')
        # 拟合线
        log_lags = np.log(np.array(list(range(2, len(rs_values)+2)))[valid_mask])
        log_rs = np.log(np.array(rs_values)[valid_mask])
        fit_line = H * log_lags + np.mean(log_rs - H * log_lags)
        axes[0, 1].plot(log_lags, fit_line, 'r--', linewidth=2, label=f'拟合线 (H={H:.4f})')
        axes[0, 1].set_xlabel('log(滞后阶数)')
        axes[0, 1].set_ylabel('log(R/S)')
        axes[0, 1].set_title('R/S 分析法', fontsize=12, fontweight='bold')
        axes[0, 1].legend()
        axes[0, 1].grid(True, alpha=0.3)
    
    # 图 3: 收益率分布
    returns = np.diff(close_prices) / close_prices[:-1]
    axes[1, 0].hist(returns, bins=50, edgecolor='black', alpha=0.7)
    axes[1, 0].axvline(x=0, color='red', linestyle='--', linewidth=2)
    axes[1, 0].set_title('日收益率分布', fontsize=12, fontweight='bold')
    axes[1, 0].set_xlabel('收益率')
    axes[1, 0].set_ylabel('频数')
    axes[1, 0].grid(True, alpha=0.3)
    
    # 图 4: Hurst 指数解读
    axes[1, 1].axis('off')
    interpretation = f"""
    ╔════════════════════════════════════════╗
    ║        Hurst 指数解读报告              ║
    ╠════════════════════════════════════════╣
    ║  H = {H:.4f}                              ║
    ╠════════════════════════════════════════╣
    ║  {interpret_hurst(H).replace(chr(10), chr(10) + '    ║  ')}
    ╠════════════════════════════════════════╣
    ║  参考标准：                            ║
    ║  • H > 0.5: 趋势延续（持久性）         ║
    ║  • H = 0.5: 随机游走                   ║
    ║  • H < 0.5: 均值回归（反持久性）       ║
    ╚════════════════════════════════════════╝
    """
    axes[1, 1].text(0.1, 0.5, interpretation, fontsize=10, family='monospace',
                   verticalalignment='center', bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
    
    plt.tight_layout()
    
    # 保存图表
    output_path = '/Users/zhanglj/openclaw/workspace/analysis/hanshow_hurst_analysis.png'
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    print(f"✅ 图表已保存：{output_path}")
    plt.show()
    
    print("\n" + "=" * 60)
    print("🦎 分析完成！")
    print("=" * 60)

if __name__ == "__main__":
    main()
