#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
计算汉朔科技 (301469) 的 Hurst 指数
时间窗口：14 天、28 天、57 天
"""

import yfinance as yf
import numpy as np
from datetime import datetime, timedelta

def get_stock_data(symbol, period="1y"):
    """获取股票历史数据（使用 yfinance）"""
    try:
        # 汉朔科技：301469.SZ
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period)
        if len(df) == 0:
            return None
        # 重命名列以匹配后续代码
        df = df.rename(columns={'Close': '收盘'})
        return df
    except Exception as e:
        print(f"获取数据失败：{e}")
        return None

def hurst_rs(log_prices, lags):
    """
    使用 R/S 分析法计算 Hurst 指数
    log_prices: 对数价格序列
    lags: 滞后列表
    """
    n = len(log_prices)
    rs_values = []
    valid_lags = []
    
    for lag in lags:
        if lag >= n or lag < 2:
            continue
            
        # 计算滚动均值和标准差
        rs_sum = 0
        count = 0
        
        step = max(1, lag // 2)
        for i in range(0, n - lag + 1, step):
            subset = log_prices[i:i + lag]
            if len(subset) < lag:
                continue
                
            # 去均值
            mean = np.mean(subset)
            centered = subset - mean
            
            # 累积离差
            cum_dev = np.cumsum(centered)
            
            # 极差 R
            R = np.max(cum_dev) - np.min(cum_dev)
            
            # 标准差 S
            S = np.std(subset)
            
            if S > 0:
                rs_sum += R / S
                count += 1
        
        if count > 0:
            rs_values.append(rs_sum / count)
            valid_lags.append(lag)
    
    # 对 log(lag) 和 log(R/S) 进行线性拟合
    if len(rs_values) < 2:
        return np.nan
    
    log_lags = np.log(valid_lags)
    log_rs = np.log(rs_values)
    
    # 线性回归斜率即为 Hurst 指数
    coeffs = np.polyfit(log_lags, log_rs, 1)
    h = coeffs[0]
    
    return h

def calculate_hurst_for_window(close_prices, window_name):
    """计算指定时间窗口的 Hurst 指数"""
    prices = np.array(close_prices)
    if len(prices) < 10:
        return np.nan
    
    # 过滤零值和负值
    prices = prices[prices > 0]
    if len(prices) < 10:
        return np.nan
    
    log_prices = np.log(prices)
    
    # 定义滞后序列（基于窗口大小）
    if window_name == "14 天":
        lags = [2, 4, 7, 10, 14]
    elif window_name == "28 天":
        lags = [2, 4, 7, 14, 21, 28]
    elif window_name == "57 天":
        lags = [2, 4, 7, 14, 21, 28, 42, 57]
    else:
        lags = [2, 4, 7, 10, 14, 21, 28]
    
    # 过滤掉超过数据长度的 lag
    lags = [l for l in lags if l < len(log_prices)]
    
    if len(lags) < 2:
        return np.nan
    
    h = hurst_rs(log_prices, lags)
    return h

def main():
    symbol = "301469.SZ"
    stock_name = "汉朔科技"
    
    print(f"📊 获取 {stock_name}({symbol}) 股票数据...")
    print("-" * 60)
    
    df = get_stock_data(symbol, period="1y")
    
    if df is None or len(df) < 100:
        print("❌ 数据不足，无法计算")
        print(f"   获取到 {len(df) if df is not None else 0} 条记录")
        return
    
    print(f"✅ 获取到 {len(df)} 条记录")
    print(f"最新收盘价：{df['收盘'].iloc[-1]:.2f}")
    print(f"数据日期范围：{df.index[0].strftime('%Y-%m-%d')} 至 {df.index[-1].strftime('%Y-%m-%d')}")
    print("-" * 60)
    
    # 计算不同时间窗口的 Hurst 指数
    windows = [
        ("14 天", 14),
        ("28 天", 28),
        ("57 天", 57),
    ]
    
    print("\n📈 Hurst 指数计算结果:\n")
    print(f"{'时间窗口':<12} | {'Hurst 指数':<12} | {'特性':<20}")
    print("-" * 60)
    
    results = []
    for window_name, window_days in windows:
        # 取最近 window_days 天的数据
        recent_data = df.tail(window_days)
        if len(recent_data) < window_days * 0.5:
            h = np.nan
        else:
            h = calculate_hurst_for_window(recent_data['收盘'].values, window_name)
        
        # 判断特性
        if np.isnan(h):
            characteristic = "数据不足"
        elif h > 0.55:
            characteristic = f"持续性 (趋势延续)"
        elif h < 0.45:
            characteristic = f"反持续性 (均值回归)"
        else:
            characteristic = f"随机游走"
        
        results.append((window_name, h, characteristic))
        print(f"{window_name:<12} | {h:>10.4f}   | {characteristic:<20}")
    
    print("-" * 60)
    
    # 分析总结
    print("\n📝 分析解读:\n")
    
    valid_results = [(w, h, c) for w, h, c in results if not np.isnan(h)]
    
    if len(valid_results) == 0:
        print("⚠️ 无法获取有效 Hurst 指数")
        return
    
    # 趋势分析
    h_values = [h for _, h, _ in valid_results]
    
    if all(h > 0.5 for h in h_values):
        print("✅ 所有时间窗口均显示持续性特征")
        print("   → 股价趋势可能会延续，适合趋势跟踪策略")
    elif all(h < 0.5 for h in h_values):
        print("✅ 所有时间窗口均显示反持续性特征")
        print("   → 股价倾向于均值回归，适合反转策略")
    else:
        print("⚠️ 不同时间窗口显示不同特征")
        print("   → 短期和长期行为不一致，需结合具体周期选择策略")
    
    # 多尺度分析
    if len(h_values) >= 2:
        h_diff = max(h_values) - min(h_values)
        if h_diff > 0.15:
            print(f"\n⚠️ Hurst 指数在不同周期差异较大 (Δ={h_diff:.3f})")
            print("   → 市场在不同时间尺度下表现出不同的记忆特性")
        else:
            print(f"\n✅ Hurst 指数在各周期较为稳定 (Δ={h_diff:.3f})")
            print("   → 市场记忆特性在不同时间尺度下保持一致")
    
    print("\n" + "=" * 60)
    print("💡 提示：Hurst 指数 > 0.5 表示趋势持续，< 0.5 表示均值回归")
    print("   计算基于 R/S 分析法，结果仅供参考，不构成投资建议")
    print("=" * 60)

if __name__ == "__main__":
    main()
