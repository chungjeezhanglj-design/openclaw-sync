# 网络打印机信息

## Brother MFC-8535DN

- **IP 地址**: 192.168.1.165
- **主机名**: Print_Brother.local
- **MAC 地址**: 30:05:5C:F5:E6:FD (从 IPv6 推断)
- **接口**: 本地网络（接口 15）

## 功能
- ✅ 彩色打印
- ✅ 双面打印
- ✅ 传真
- ✅ 扫描

## 支持格式
- application/pdf
- image/urf
- image/pwg-raster
- application/octet-stream (PCL)

## 管理页面
http://Print_Brother.local/ 或 http://192.168.1.165/

## 添加方式

### 方法 1: 系统设置（推荐）
1. 系统设置 → 打印机与扫描仪
2. 点击"添加打印机"
3. 选择 Brother MFC-8535DN (应该会自动发现)
4. 或使用 IP: 192.168.1.165，协议：HP Jetdirect - Socket

### 方法 2: 命令行（需要 sudo）
```bash
sudo lpadmin -p Brother_MFC_8535DN -v socket://192.168.1.165:9100 -m everywhere
sudo cupsenable Brother_MFC_8535DN
sudo cupsaccept Brother_MFC_8535DN
```

---
发现时间：2026-03-08 14:17
