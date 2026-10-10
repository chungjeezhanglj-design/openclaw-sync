#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
计算汉朔科技 (301469) 的 Hurst 指数 - 使用 akshare 备用方案
"""

import akshare as ak
import numpy as np
import time

def get_stock_data_akshare(symbol):
    """获取 A 股股票历史数据（akshare）"""
    try:
        # 尝试不同的接口
        df = ak.stock_zh_a_hist(symbol=symbol, period="daily", adjust="qfq")
        return df
    except Exception as e1:
        print(f"接口 1 失败：{e1}")
        try:
            # 备用接口
            df = ak.stock_zh_a_daily(symbol=symbol)
            return df
        except Exception as e2:
            print(f"接口 2 失败：{e2}")
            return None

def hurst_rs(log_prices, lags):
    """使用 R/S 分析法计算 Hurst 指数"""
    n = len(log_prices)
    rs_values = []
    valid_lags = []
    
    for lag in lags:
        if lag >= n or lag < 2:
            continue
            
        rs_sum = 0
        count = 0
        step = max(1, lag // 2)
        
        for i in range(0, n - lag + 1, step):
            subset = log_prices[i:i + lag]
            if len(subset) < lag:
                continue
            
            mean = np.mean(subset)
            centered = subset - mean
            cum_dev = np.cumsum(centered)
            R = np.max(cum_dev) - np.min(cum_dev)
            S = np.std(subset)
            
            if S > 0:
                rs_sum += R / S
                count += 1
        
        if count > 0:
            rs_values.append(rs_sum / count)
            valid_lags.append(lag)
    
    if len(rs_values) < 2:
        return np.nan
    
    log_lags = np.log(valid_lags)
    log_rs = np.log(rs_values)
    coeffs = np.polyfit(log_lags, log_rs, 1)
    return coeffs[0]

def calculate_hurst(prices, window_name):
    """计算 Hurst 指数"""
    prices = np.array(prices[prices > 0])
    if len(prices) < 10:
        return np.nan
    
    log_prices = np.log(prices)
    
    if window_name == "14 天":
        lags = [2, 4, 7, 10, 14]
    elif window_name == "28 天":
        lags = [2, 4, 7, 14, 21, 28]
    elif window_name == "57 天":
        lags = [2, 4, 7, 14, 21, 28, 42, 57]
    else:
        lags = [2, 4, 7, 10, 14, 21, 28]
    
    lags = [l for l in lags if l < len(log_prices)]
    if len(lags) < 2:
        return np.nan
    
    return hurst_rs(log_prices, lags)

def main():
    symbol = "301469"
    stock_name = "汉朔科技"
    
    print(f"📊 获取 {stock_name}({symbol}) 股票数据...")
    print("-" * 60)
    
    # 重试机制
    max_retries = 3
    df = None
    
    for i in range(max_retries):
        try:
            df = get_stock_data_akshare(symbol)
            if df is not None and len(df) > 0:
                break
        except Exception as e:
            print(f"尝试 {i+1}/{max_retries} 失败：{e}")
            if i < max_retries - 1:
                print("等待 3 秒后重试...")
                time.sleep(3)
    
    if df is None or len(df) < 60:
        print(f"❌ 数据不足，获取到 {len(df) if df is not None else 0} 条记录")
        return
    
    print(f"✅ 获取到 {len(df)} 条记录")
    
    # 检查列名
    if '收盘' not in df.columns:
        print(f"❌ 未找到'收盘'列，可用列：{df.columns.tolist()}")
        return
    
    print(f"最新收盘价：{df['收盘'].iloc[-1]:.2f}")
    print(f"数据日期：{df['日期'].iloc[0]} 至 {df['日期'].iloc[-1]}")
    print("-" * 60)
    
    windows = [("14 天", 14), ("28 天", 28), ("57 天", 57)]
    
    print("\n📈 Hurst 指数计算结果:\n")
    print(f"{'时间窗口':<12} | {'Hurst 指数':<12} | {'特性':<20}")
    print("-" * 60)
    
    results = []
    for window_name, window_days in windows:
        recent_data = df.tail(window_days)
        if len(recent_data) < window_days * 0.5:
            h = np.nan
        else:
            h = calculate_hurst(recent_data['收盘'].values, window_name)
        
        if np.isnan(h):
            characteristic = "数据不足"
        elif h > 0.55:
            characteristic = "持续性 (趋势延续)"
        elif h < 0.45:
            characteristic = "反持续性 (均值回归)"
        else:
            characteristic = "随机游走"
        
        results.append((window_name, h, characteristic))
        h_str = f"{h:.4f}" if not np.isnan(h) else "N/A"
        print(f"{window_name:<12} | {h_str:>10}   | {characteristic:<20}")
    
    print("-" * 60)
    print("\n📝 分析解读:\n")
    
    valid_results = [(w, h, c) for w, h, c in results if not np.isnan(h)]
    
    if len(valid_results) == 0:
        print("⚠️ 无法获取有效 Hurst 指数")
        return
    
    h_values = [h for _, h, _ in valid_results]
    
    if all(h > 0.5 for h in h_values):
        print("✅ 所有时间窗口均显示持续性特征")
        print("   → 股价趋势可能会延续，适合趋势跟踪策略")
    elif all(h < 0.5 for h in h_values):
        print("✅ 所有时间窗口均显示反持续性特征")
        print("   → 股价倾向于均值回归，适合反转策略")
    else:
        print("⚠️ 不同时间窗口显示不同特征")
        print("   → 短期和长期行为不一致")
    
    if len(h_values) >= 2:
        h_diff = max(h_values) - min(h_values)
        status = "⚠️ 差异较大" if h_diff > 0.15 else "✅ 较为稳定"
        print(f"\n{status} (Δ={h_diff:.3f})")
    
    print("\n" + "=" * 60)
    print("💡 Hurst > 0.5: 趋势持续 | < 0.5: 均值回归")
    print("   结果仅供参考，不构成投资建议")
    print("=" * 60)

if __name__ == "__main__":
    main()
