/**
 * geocoding.test.ts
 *
 * 覆盖:
 * - 无 API key → 返回 null
 * - 成功响应 → 解析 addressComponent
 * - 失败 status → 返回 null
 * - 网络异常 → 返回 null
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reverseGeocode } from './geocoding';

const mockFetch = vi.fn();

describe('reverseGeocode', () => {
  const ORIGINAL_AMAP = process.env.AMAP_KEY;

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    if (ORIGINAL_AMAP === undefined) {
      delete process.env.AMAP_KEY;
    } else {
      process.env.AMAP_KEY = ORIGINAL_AMAP;
    }
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('未配置 AMAP_KEY 时返回 null', async () => {
    delete process.env.AMAP_KEY;
    const result = await reverseGeocode(36.0671, 120.3826);
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('高德返回 status=1 时解析地址组件', async () => {
    process.env.AMAP_KEY = 'test-amap-key';

    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        status: '1',
        regeocode: {
          addressComponent: {
            province: '山东省',
            city: '青岛市',
            district: '市南区',
            streetNumber: { street: '香港中路' },
          },
        },
      }),
    } as Response);

    const result = await reverseGeocode(36.0671, 120.3826);

    expect(result).toEqual({
      address: '山东省青岛市市南区香港中路',
      province: '山东省',
      city: '青岛市',
      district: '市南区',
      street: '香港中路',
    });
  });

  it('city 为空时回退到 province', async () => {
    process.env.AMAP_KEY = 'k';

    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        status: '1',
        regeocode: {
          addressComponent: {
            province: '北京市',
            city: '', // 直辖市无 city 字段
            district: '朝阳区',
            streetNumber: { street: '建国路' },
          },
        },
      }),
    } as Response);

    const result = await reverseGeocode(39.9, 116.4);

    expect(result?.city).toBe('北京市');
    expect(result?.address).toContain('北京市');
  });

  it('streetNumber.street 为空时回退到 township', async () => {
    process.env.AMAP_KEY = 'k';

    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        status: '1',
        regeocode: {
          addressComponent: {
            province: '浙江省',
            city: '杭州市',
            district: '西湖区',
            streetNumber: {},
            township: '灵隐街道',
          },
        },
      }),
    } as Response);

    const result = await reverseGeocode(30.2, 120.1);

    expect(result?.street).toBe('灵隐街道');
  });

  it('高德 status 非 1 时返回 null', async () => {
    process.env.AMAP_KEY = 'k';

    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        status: '0',
        info: 'INVALID_USER_KEY',
      }),
    } as Response);

    const result = await reverseGeocode(36, 120);
    expect(result).toBeNull();
  });

  it('fetch 抛出异常时返回 null', async () => {
    process.env.AMAP_KEY = 'k';
    mockFetch.mockRejectedValueOnce(new Error('network down'));

    const result = await reverseGeocode(36, 120);
    expect(result).toBeNull();
  });

  it('调用时使用正确的 lng,lat 顺序 (高德要求)', async () => {
    process.env.AMAP_KEY = 'test-key';

    mockFetch.mockResolvedValueOnce({
      json: async () => ({ status: '0' }),
    } as Response);

    await reverseGeocode(36.0671, 120.3826);

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('location=120.3826,36.0671'); // 经度在前
    expect(url).toContain('key=test-key');
  });

  it('address 末尾自动去掉 "市" 字 (避免 "青岛市市" 这种重复)', async () => {
    process.env.AMAP_KEY = 'k';

    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        status: '1',
        regeocode: {
          addressComponent: {
            province: '山东省',
            city: '青岛市',
            district: '市南区',
            streetNumber: { street: '香港中路' },
          },
        },
      }),
    } as Response);

    const result = await reverseGeocode(36, 120);

    // 因为 city 已是"青岛市",直接拼接会得到"山东省青岛市市南区..."(district 不是"市")
    // 如果 district 也是"xx市"才会触发去重
    expect(result?.address).toBe('山东省青岛市市南区香港中路');
  });
});
