/**
 * SearchBar.test.tsx
 *
 * 覆盖:
 * - 输入框 onChange 双向绑定
 * - 空输入时搜索按钮 disabled
 * - 输入回车触发搜索
 * - 点击 X 清空输入
 * - 点击外部区域关闭 panel
 * - parseSearch 失败时 catch 错误,不抛
 * - onSearchResults 回调正确触发
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchBar from './SearchBar';

// mock searchApi
vi.mock('../../services/api', () => ({
  searchApi: {
    parseSearch: vi.fn(),
    searchPhotos: vi.fn(),
  },
}));

import { searchApi } from '../../services/api';

const mockPhotos = [
  { id: '1', url: 'http://x/1.jpg', caption: 'photo 1' },
  { id: '2', url: 'http://x/2.jpg', caption: 'photo 2' },
];

describe('SearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 默认 mock: parseSearch 返回合法 intent
    vi.mocked(searchApi.parseSearch).mockResolvedValue({
      data: {
        data: {
          originalQuery: 'test',
          intent: {
            startDate: null,
            endDate: null,
            location: '青岛',
            keywords: ['海滩'],
          },
        },
      },
    } as any);

    vi.mocked(searchApi.searchPhotos).mockResolvedValue({
      data: {
        data: {
          intent: { startDate: null, endDate: null, location: '青岛', keywords: ['海滩'] },
          photos: mockPhotos,
          total: 2,
        },
      },
    } as any);
  });

  it('渲染搜索框和搜索按钮', () => {
    render(<SearchBar />);
    expect(screen.getByPlaceholderText(/搜索照片/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '搜索' })).toBeInTheDocument();
  });

  it('输入框受控,onChange 更新 value', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    const input = screen.getByPlaceholderText(/搜索照片/) as HTMLInputElement;

    await user.type(input, '青岛海滩');

    expect(input.value).toBe('青岛海滩');
  });

  it('空输入时搜索按钮 disabled', () => {
    render(<SearchBar />);
    const btn = screen.getByRole('button', { name: '搜索' }) as HTMLButtonElement;
    expect(btn).toBeDisabled();
  });

  it('有输入时搜索按钮 enabled', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    const input = screen.getByPlaceholderText(/搜索照片/);

    await user.type(input, 'test');
    expect(screen.getByRole('button', { name: '搜索' })).not.toBeDisabled();
  });

  it('空白输入 (只有空格) 时搜索按钮 disabled', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    const input = screen.getByPlaceholderText(/搜索照片/);

    await user.type(input, '   ');

    expect(screen.getByRole('button', { name: '搜索' })).toBeDisabled();
  });

  it('点击搜索按钮触发 parseSearch + searchPhotos + 回调', async () => {
    const user = userEvent.setup();
    const onSearchResults = vi.fn();
    render(<SearchBar onSearchResults={onSearchResults} />);

    const input = screen.getByPlaceholderText(/搜索照片/);
    await user.type(input, '青岛海滩');

    await user.click(screen.getByRole('button', { name: '搜索' }));

    await waitFor(() => {
      expect(searchApi.parseSearch).toHaveBeenCalledWith('青岛海滩');
    });

    await waitFor(() => {
      expect(searchApi.searchPhotos).toHaveBeenCalledWith({
        intent: {
          startDate: null,
          endDate: null,
          location: '青岛',
          keywords: ['海滩'],
        },
      });
    });

    await waitFor(() => {
      expect(onSearchResults).toHaveBeenCalledWith(mockPhotos);
    });
  });

  it('按 Enter 键触发搜索', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    const input = screen.getByPlaceholderText(/搜索照片/);
    await user.type(input, '北京{Enter}');

    await waitFor(() => {
      expect(searchApi.parseSearch).toHaveBeenCalledWith('北京');
    });
  });

  it('parseSearch 失败时 catch,不抛错', async () => {
    const user = userEvent.setup();
    vi.mocked(searchApi.parseSearch).mockRejectedValueOnce(new Error('Network error'));

    // console.error 会因为错误被调用,屏蔽它
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<SearchBar />);
    await user.type(screen.getByPlaceholderText(/搜索照片/), 'test');
    await user.click(screen.getByRole('button', { name: '搜索' }));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Search error:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('点击 X 按钮清空输入', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    const input = screen.getByPlaceholderText(/搜索照片/) as HTMLInputElement;
    await user.type(input, 'test');

    expect(input.value).toBe('test');

    // 点击 X 清空按钮 (图标按钮)
    const clearBtn = screen.getByRole('button', { name: '' }); // FiX 无 aria-label
    // 找到所有按钮,第一个非搜索按钮是 X
    await user.click(clearBtn);

    expect(input.value).toBe('');
  });

  it('搜索成功后打开 panel,显示时间和地点编辑字段', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    await user.type(screen.getByPlaceholderText(/搜索照片/), '青岛');
    await user.click(screen.getByRole('button', { name: '搜索' }));

    // panel 出现,显示 "时间范围" / "地点" / "关键词" 等字段
    await waitFor(() => {
      expect(screen.getByText('时间范围')).toBeInTheDocument();
    });
    expect(screen.getByText('地点')).toBeInTheDocument();
    expect(screen.getByText('关键词')).toBeInTheDocument();
  });

  it('点击 panel 外部区域关闭 panel', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <div data-testid="outside">OUTSIDE</div>
        <SearchBar />
      </div>,
    );

    await user.type(screen.getByPlaceholderText(/搜索照片/), '青岛');
    await user.click(screen.getByRole('button', { name: '搜索' }));

    // 等 panel 出现
    await waitFor(() => {
      expect(screen.getByText('时间范围')).toBeInTheDocument();
    });

    // 点击 outside
    fireEvent.mouseDown(screen.getByTestId('outside'));

    await waitFor(() => {
      expect(screen.queryByText('时间范围')).not.toBeInTheDocument();
    });
  });
});
