import { Link } from 'react-router-dom'
import { FiHome, FiEdit, FiImage, FiCpu, FiMoon, FiSun, FiMap, FiUser, FiSettings, FiClock, FiArrowUp, FiArrowDown } from 'react-icons/fi'

export function Help() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">个人博客使用帮助</h1>

      <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">目录</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <a href="#register" className="text-primary-600 dark:text-primary-400 hover:underline">注册登录</a>
          <a href="#home" className="text-primary-600 dark:text-primary-400 hover:underline">首页介绍</a>
          <a href="#views" className="text-primary-600 dark:text-primary-400 hover:underline">四种视图</a>
          <a href="#editor" className="text-primary-600 dark:text-primary-400 hover:underline">写文章</a>
          <a href="#ai" className="text-primary-600 dark:text-primary-400 hover:underline">AI 辅助</a>
          <a href="#gps" className="text-primary-600 dark:text-primary-400 hover:underline">位置获取</a>
          <a href="#profile" className="text-primary-600 dark:text-primary-400 hover:underline">用户中心</a>
          <a href="#settings" className="text-primary-600 dark:text-primary-400 hover:underline">显示设置</a>
          <a href="#theme" className="text-primary-600 dark:text-primary-400 hover:underline">深色模式</a>
          <a href="#api" className="text-primary-600 dark:text-primary-400 hover:underline">API 文档</a>
        </div>
      </div>

      <section id="register" className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          <FiUser className="w-6 h-6 text-primary-600" />
          注册与登录
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-4">
          <img 
            src="/help/01-login.png" 
            alt="登录页面"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 mb-4"
          />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            支持邮箱注册登录和微信快速登录。登录后可享受更多功能。
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">💡 登录后功能</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-700 dark:text-blue-300">
              <li>发布文章和照片</li>
              <li>点赞、评论、分享文章</li>
              <li>管理个人资料和设置</li>
              <li>查看点赞和评论的文章</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="home" className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          <FiHome className="w-6 h-6 text-primary-600" />
          首页介绍
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-4">
          <img 
            src="/help/02-home.png" 
            alt="首页"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 mb-4"
          />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            首页展示所有已发布的文章，支持多种视图模式，方便浏览和探索。
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">未登录</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">浏览和阅读文章</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">已登录</h4>
              <p className="text-sm text-green-700 dark:text-green-300">写文章、点赞、评论、分享</p>
            </div>
          </div>
        </div>
      </section>

      <section id="views" className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          <FiImage className="w-6 h-6 text-primary-600" />
          四种视图模式
        </h2>
        <div className="grid md:grid-cols-2 gap-6 mb-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <img 
              src="/help/02-home.png" 
              alt="时间线视图"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 mb-3"
            />
            <div className="flex items-center gap-2 mb-2">
              <FiClock className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">时间线视图</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              按时间顺序展示文章卡片，左右交替布局。顶部有年份浮动标签，随滚动自动切换。
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <img 
              src="/help/03-grid.png" 
              alt="网格视图"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 mb-3"
            />
            <div className="flex items-center gap-2 mb-2">
              <FiImage className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">网格视图</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              方形卡片网格展示，每行列数自适应。多图文章显示 2x2 网格预览。
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <img 
              src="/help/04-masonry.png" 
              alt="瀑布流视图"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 mb-3"
            />
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">≋</span>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">瀑布流视图</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              不规则高度的卡片瀑布流布局，模仿 Pinterest 风格，视觉更生动。
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <img 
              src="/help/05-map.png" 
              alt="地图视图"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 mb-3"
            />
            <div className="flex items-center gap-2 mb-2">
              <FiMap className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">地图视图</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              在地图上展示带 GPS 坐标的照片位置，点击标记可查看照片和文章信息。
            </p>
          </div>
        </div>
      </section>

      <section id="editor" className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          <FiEdit className="w-6 h-6 text-primary-600" />
          写文章
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-4">
          <img 
            src="/help/06-editor.png" 
            alt="编辑器"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 mb-4"
          />
          <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">发布文章步骤</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400 mb-6">
            <li>登录后点击导航栏「写文章」进入编辑器</li>
            <li>点击或拖拽上传照片（支持多张，最多 9 张）</li>
            <li>AI 自动分析图片，生成标题，配文、标签</li>
            <li>编辑或修改自动生成的内容</li>
            <li>选择文章布局（时间线/网格/瀑布流）</li>
            <li>选择发布状态（发布/草稿）</li>
            <li>点击「发布」或「保存草稿」</li>
          </ol>
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">🤖 AI 自动生成</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-purple-700 dark:text-purple-300">
              <li>上传照片后自动调用 AI 分析</li>
              <li>自动生成标题，配文、标签</li>
              <li>可选择不同类型的 AI 提示词</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="ai" className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          <FiCpu className="w-6 h-6 text-primary-600" />
          AI 辅助功能
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">AI 图片分析</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                系统集成 AI 大模型分析照片，自动生成：
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 text-sm">
                <li><strong>标题</strong> - 简洁有力的文章标题</li>
                <li><strong>配文</strong> - 符合图片内容的描述</li>
                <li><strong>标签</strong> - 自动添加相关标签</li>
                <li><strong>场景</strong> - 识别拍摄场景类型</li>
                <li><strong>情感</strong> - 判断照片的氛围情感</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">AI 提示词管理</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                在用户中心可以管理和切换 AI 提示词预设：
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 text-sm">
                <li>通用图片分析</li>
                <li>产品图片分析</li>
                <li>UI/截图分析</li>
                <li>图表数据分析</li>
                <li>文档扫描识别</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="gps" className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          <FiMap className="w-6 h-6 text-primary-600" />
          位置获取
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            系统支持多种方式获取照片位置信息：
          </p>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">📷 EXIF GPS</h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                照片自带的 GPS 信息，直接从图片 EXIF 数据中提取
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">📍 设备定位</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                如果照片没有 GPS，系统会获取设备当前位置作为照片位置
              </p>
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">📌 提示</h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              位置信息用于地图展示和显示照片拍摄地点。如果没有位置信息，照片将不会显示在地图视图中。
            </p>
          </div>
        </div>
      </section>

      <section id="profile" className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          <FiUser className="w-6 h-6 text-primary-600" />
          用户中心
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-4">
          <img 
            src="/help/07-profile.png" 
            alt="用户中心"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 mb-4"
          />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            点击导航栏头像进入用户中心，可管理：
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">我的文章</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">查看和管理已发布/草稿文章</p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">个人资料</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">编辑昵称、头像、简介等信息</p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">点赞</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">查看所有点赞过的文章</p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">评论</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">查看所有评论过的文章</p>
            </div>
          </div>
        </div>
      </section>

      <section id="settings" className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          <FiSettings className="w-6 h-6 text-primary-600" />
          显示设置
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-4">
          <img 
            src="/help/08-settings.png" 
            alt="显示设置"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 mb-4"
          />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            在用户中心的「显示设置」中，可以自定义博客卡片的显示方式：
          </p>
          <div className="space-y-4">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FiClock className="w-5 h-5 text-primary-600" />
                <h4 className="font-medium text-gray-900 dark:text-white">博客卡片时间显示</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                选择时间线、网格、瀑布流布局中显示的时间依据：发布时间 或 拍摄时间
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FiArrowUp className="w-5 h-5 text-primary-600" />
                <FiArrowDown className="w-5 h-5 text-primary-600" />
                <h4 className="font-medium text-gray-900 dark:text-white">博客卡片排序</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                选择文章列表的排序方式：降序（最新在前）或 升序（最早在前）
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FiCpu className="w-5 h-5 text-primary-600" />
                <h4 className="font-medium text-gray-900 dark:text-white">默认 AI 提示词</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                选择图片分析时使用的默认提示词预设
              </p>
            </div>
          </div>
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">💡 提示</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              设置修改后点击「应用」保存。点击「取消」可撤销未保存的修改。
            </p>
          </div>
        </div>
      </section>

      <section id="theme" className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          <FiMoon className="w-6 h-6 text-primary-600" />
          深色模式
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            点击右上角的主题切换按钮，可以在深色和浅色模式之间切换。系统会记住你的主题偏好。
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2">
              <FiMoon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">浅色模式</span>
            </div>
            <span className="text-gray-400">↔</span>
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-4 py-2">
              <FiSun className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-white">深色模式</span>
            </div>
          </div>
        </div>
      </section>

      <section id="api" className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
          API 技术文档
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            如果你需要开发第三方应用或了解系统接口，可以查看完整的 API 技术文档。
          </p>
          <Link
            to="/api-docs"
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            查看 API 文档 →
          </Link>
        </div>
      </section>

      <div className="text-center text-gray-500 text-sm py-8">
        <p>© 2024 个人博客 · 有问题请查看帮助页面</p>
      </div>
    </div>
  )
}
