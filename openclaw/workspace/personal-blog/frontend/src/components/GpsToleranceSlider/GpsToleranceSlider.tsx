import { useState, useEffect } from 'react';

interface GpsToleranceSliderProps {
  onChange?: (value: number) => void;
}

export function GpsToleranceSlider({ onChange }: GpsToleranceSliderProps) {
  // 从 localStorage 读取容差值，默认 50 米
  const [tolerance, setTolerance] = useState<number>(() => {
    const saved = localStorage.getItem('gpsTolerance');
    return saved ? parseInt(saved) : 50;
  });

  // 当容差值变化时，调用 onChange 回调
  useEffect(() => {
    onChange?.(tolerance);
  }, [tolerance, onChange]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    setTolerance(newValue);
    // 保存到 localStorage
    localStorage.setItem('gpsTolerance', newValue.toString());
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
        <span>容差:</span>
      </div>
      
      <input
        type="range"
        min="10"
        max="500"
        step="10"
        value={tolerance}
        onChange={handleSliderChange}
        className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
        title="GPS 容差值（米）"
      />
      
      <div className="flex items-center gap-1 min-w-[60px]">
        <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-right">
          {tolerance}
        </span>
        <span className="text-sm text-gray-600 dark:text-gray-400">米</span>
      </div>
    </div>
  );
}
