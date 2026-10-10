import { FiLayout, FiGrid, FiMap, FiCalendar } from 'react-icons/fi'
import { LayoutType } from '../../types'
import { useLayoutStore } from '../../stores'

interface LayoutSwitcherProps {
  options?: LayoutType[]
}

const layoutOptions = [
  { type: 'timeline' as LayoutType, label: '时间线', icon: FiCalendar },
  { type: 'grid' as LayoutType, label: '网格', icon: FiGrid },
  { type: 'masonry' as LayoutType, label: '瀑布流', icon: FiLayout },
  { type: 'map' as LayoutType, label: '地图', icon: FiMap },
]

export function LayoutSwitcher({ options }: LayoutSwitcherProps) {
  const { layoutType, setLayoutType } = useLayoutStore()

  const availableOptions = options 
    ? layoutOptions.filter(opt => options.includes(opt.type))
    : layoutOptions

  return (
    <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
      {availableOptions.map(({ type, label, icon: Icon }) => (
        <button
          key={type}
          onClick={() => setLayoutType(type)}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            layoutType === type
              ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
          title={label}
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}
