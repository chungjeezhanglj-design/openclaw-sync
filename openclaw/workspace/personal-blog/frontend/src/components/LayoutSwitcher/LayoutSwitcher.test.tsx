/**
 * LayoutSwitcher.test.tsx
 *
 * 覆盖:
 * - 默认渲染 4 个布局选项
 * - 当前 layoutType 高亮 (有 active class)
 * - 点击切换 layout (通过 useLayoutStore)
 * - options prop 过滤显示哪些选项
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayoutSwitcher } from './LayoutSwitcher';
import { useLayoutStore } from '../../stores';

describe('LayoutSwitcher', () => {
  beforeEach(() => {
    // 重置 zustand store 到初始值
    useLayoutStore.setState({ layoutType: 'timeline' });
  });

  it('默认渲染 4 个布局选项', () => {
    render(<LayoutSwitcher />);
    expect(screen.getByTitle('时间线')).toBeInTheDocument();
    expect(screen.getByTitle('网格')).toBeInTheDocument();
    expect(screen.getByTitle('瀑布流')).toBeInTheDocument();
    expect(screen.getByTitle('地图')).toBeInTheDocument();
  });

  it('当前选中的 layout 有 visual indicator (白色背景 class)', () => {
    useLayoutStore.setState({ layoutType: 'grid' });
    render(<LayoutSwitcher />);

    const gridBtn = screen.getByTitle('网格');
    // 当前选中的按钮 className 包含 'bg-white'
    expect(gridBtn.className).toContain('bg-white');

    const timelineBtn = screen.getByTitle('时间线');
    // 其他按钮没有 active class
    expect(timelineBtn.className).not.toContain('bg-white');
  });

  it('点击按钮切换 layout', async () => {
    const user = userEvent.setup();
    render(<LayoutSwitcher />);

    expect(useLayoutStore.getState().layoutType).toBe('timeline');

    await user.click(screen.getByTitle('地图'));

    expect(useLayoutStore.getState().layoutType).toBe('map');
  });

  it('点击其他按钮切换后,新按钮获得 active class', async () => {
    const user = userEvent.setup();
    render(<LayoutSwitcher />);

    await user.click(screen.getByTitle('瀑布流'));

    const masonryBtn = screen.getByTitle('瀑布流');
    expect(masonryBtn.className).toContain('bg-white');
  });

  it('options prop 过滤显示哪些选项', () => {
    render(<LayoutSwitcher options={['timeline', 'grid']} />);

    expect(screen.getByTitle('时间线')).toBeInTheDocument();
    expect(screen.getByTitle('网格')).toBeInTheDocument();
    expect(screen.queryByTitle('瀑布流')).not.toBeInTheDocument();
    expect(screen.queryByTitle('地图')).not.toBeInTheDocument();
  });

  it('options 为空数组时不渲染任何按钮', () => {
    const { container } = render(<LayoutSwitcher options={[]} />);
    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(0);
  });

  it('每个按钮都有 title 属性 (鼠标 hover 显示中文名)', () => {
    render(<LayoutSwitcher />);
    const buttons = screen.getAllByRole('button');
    for (const btn of buttons) {
      expect(btn.getAttribute('title')).toBeTruthy();
    }
  });
});
