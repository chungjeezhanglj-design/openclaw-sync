export function ApiDocs() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">API 技术文档</h1>

      {/* 目录 */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">目录</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <a href="#auth" className="text-primary-600 dark:text-primary-400 hover:underline">认证接口</a>
          <a href="#posts" className="text-primary-600 dark:text-primary-400 hover:underline">文章接口</a>
          <a href="#photos" className="text-primary-600 dark:text-primary-400 hover:underline">照片接口</a>
          <a href="#comments" className="text-primary-600 dark:text-primary-400 hover:underline">评论接口</a>
          <a href="#tags" className="text-primary-600 dark:text-primary-400 hover:underline">标签接口</a>
          <a href="#models" className="text-primary-600 dark:text-primary-400 hover:underline">数据模型</a>
          <a href="#errors" className="text-primary-600 dark:text-primary-400 hover:underline">错误处理</a>
        </div>
      </div>

      {/* 基础信息 */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">基础信息</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Base URL</h4>
              <code className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded text-primary-600">/api</code>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">认证方式</h4>
              <p className="text-gray-600 dark:text-gray-400">
                Bearer Token（JWT）在请求头中传递：
                <code className="bg-gray-100 dark:bg-gray-700 ml-2 px-2 py-0.5 rounded">Authorization: Bearer &lt;token&gt;</code>
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">响应格式</h4>
              <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto">
{`{
  "status": "success" | "error",
  "data": { ... },
  "message": "..." // 错误时
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* 认证接口 */}
      <section id="auth" className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">认证接口</h2>
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-green-500 text-white px-2 py-0.5 rounded text-sm">POST</span>
              <code className="text-gray-900 dark:text-white">/auth/register</code>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">用户注册</p>
            <h4 className="font-medium mb-2">请求参数</h4>
            <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto">
{`{
  "email": "user@example.com",
  "password": "password123",
  "nickname": "昵称"
}`}
            </pre>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-green-500 text-white px-2 py-0.5 rounded text-sm">POST</span>
              <code className="text-gray-900 dark:text-white">/auth/login</code>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">用户登录</p>
            <h4 className="font-medium mb-2">请求参数</h4>
            <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto">
{`{
  "email": "user@example.com",
  "password": "password123"
}`}
            </pre>
            <h4 className="font-medium mt-4 mb-2">响应</h4>
            <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto">
{`{
  "status": "success",
  "data": {
    "user": { "id": "...", "nickname": "...", "avatar": "..." },
    "token": "jwt_token_string"
  }
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* 文章接口 */}
      <section id="posts" className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">文章接口</h2>
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-blue-500 text-white px-2 py-0.5 rounded text-sm">GET</span>
              <code className="text-gray-900 dark:text-white">/posts</code>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">获取文章列表</p>
            <h4 className="font-medium mb-2">查询参数</h4>
            <table className="w-full text-sm text-gray-600 dark:text-gray-400">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-2">参数</th>
                  <th className="text-left py-2">类型</th>
                  <th className="text-left py-2">说明</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b dark:border-gray-700">
                  <td className="py-2">page</td>
                  <td className="py-2">number</td>
                  <td className="py-2">页码，默认 1</td>
                </tr>
                <tr className="border-b dark:border-gray-700">
                  <td className="py-2">limit</td>
                  <td className="py-2">number</td>
                  <td className="py-2">每页数量，默认 10</td>
                </tr>
                <tr className="border-b dark:border-gray-700">
                  <td className="py-2">status</td>
                  <td className="py-2">string</td>
                  <td className="py-2">published/draft</td>
                </tr>
                <tr>
                  <td className="py-2">layout</td>
                  <td className="py-2">string</td>
                  <td className="py-2">timeline/grid/waterfall</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-green-500 text-white px-2 py-0.5 rounded text-sm">POST</span>
              <code className="text-gray-900 dark:text-white">/posts</code>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">创建文章</p>
            <h4 className="font-medium mb-2">请求参数</h4>
            <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto">
{`{
  "title": "文章标题",
  "content": "文章内容",
  "layoutType": "timeline", // timeline | grid | waterfall
  "status": "published" // published | draft
}`}
            </pre>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-yellow-500 text-white px-2 py-0.5 rounded text-sm">PUT</span>
              <code className="text-gray-900 dark:text-white">/posts/:id</code>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">更新文章</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-red-500 text-white px-2 py-0.5 rounded text-sm">DELETE</span>
              <code className="text-gray-900 dark:text-white">/posts/:id</code>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">删除文章</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-green-500 text-white px-2 py-0.5 rounded text-sm">POST</span>
              <code className="text-gray-900 dark:text-white">/posts/:id/like</code>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">点赞/取消点赞</p>
          </div>
        </div>
      </section>

      {/* 照片接口 */}
      <section id="photos" className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">照片接口</h2>
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-green-500 text-white px-2 py-0.5 rounded text-sm">POST</span>
              <code className="text-gray-900 dark:text-white">/photos/upload</code>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">上传照片</p>
            <h4 className="font-medium mb-2">请求格式</h4>
            <p className="text-gray-600 dark:text-gray-400 mb-2">multipart/form-data</p>
            <table className="w-full text-sm text-gray-600 dark:text-gray-400">
              <tbody>
                <tr className="border-b dark:border-gray-700">
                  <td className="py-2">photos</td>
                  <td className="py-2">File[]</td>
                  <td className="py-2">图片文件</td>
                </tr>
                <tr>
                  <td className="py-2">postId</td>
                  <td className="py-2">string (可选)</td>
                  <td className="py-2">关联的文章 ID</td>
                </tr>
              </tbody>
            </table>
            <h4 className="font-medium mt-4 mb-2">响应</h4>
            <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto">
{`{
  "status": "success",
  "data": {
    "photos": [
      {
        "id": "uuid",
        "url": "/uploads/xxx.jpg",
        "caption": "AI 生成的描述",
        "aiConfidence": 0.95,
        "aiTags": ["风景", "自然"],
        "gpsLat": 31.234,
        "gpsLng": 121.456,
        "locationName": "上海市",
        "deviceName": "iPhone 15 Pro"
      }
    ]
  }
}`}
            </pre>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-green-500 text-white px-2 py-0.5 rounded text-sm">POST</span>
              <code className="text-gray-900 dark:text-white">/photos/:id/analyze</code>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">AI 分析照片</p>
            <p className="text-gray-600 dark:text-gray-400">使用 MiniMax AI 分析照片，生成 caption、tags、scene、mood</p>
          </div>
        </div>
      </section>

      {/* 评论接口 */}
      <section id="comments" className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">评论接口</h2>
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-green-500 text-white px-2 py-0.5 rounded text-sm">POST</span>
              <code className="text-gray-900 dark:text-white">/comments/post/:postId</code>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">发表评论</p>
            <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto">
{`{
  "content": "评论内容",
  "parentId": "父评论ID (可选)"
}`}
            </pre>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-blue-500 text-white px-2 py-0.5 rounded text-sm">GET</span>
              <code className="text-gray-900 dark:text-white">/comments/post/:postId</code>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">获取文章评论</p>
          </div>
        </div>
      </section>

      {/* 标签接口 */}
      <section id="tags" className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">标签接口</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-blue-500 text-white px-2 py-0.5 rounded text-sm">GET</span>
            <code className="text-gray-900 dark:text-white">/tags</code>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">获取所有标签</p>
        </div>
      </section>

      {/* 数据模型 */}
      <section id="models" className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">数据模型</h2>
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">Post</h3>
            <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "id": "uuid",
  "title": "string",
  "content": "string",
  "layoutType": "timeline" | "grid" | "waterfall",
  "status": "published" | "draft",
  "viewCount": number,
  "likeCount": number,
  "commentCount": number,
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "user": User,
  "photos": Photo[],
  "tags": Tag[]
}`}
            </pre>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">Photo</h3>
            <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "id": "uuid",
  "url": "/uploads/xxx.jpg",
  "caption": "string",
  "aiConfidence": number,
  "aiTags": string[],
  "gpsLat": number | null,
  "gpsLng": number | null,
  "locationName": "string | null",
  "deviceName": "string | null",
  "takenAt": "datetime | null"
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* 错误处理 */}
      <section id="errors" className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">错误处理</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="font-medium mb-3">错误响应格式</h3>
          <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto">
{`{
  "status": "error",
  "message": "错误描述信息"
}`}
          </pre>
          <h3 className="font-medium mt-4 mb-3">常见错误码</h3>
          <table className="w-full text-sm text-gray-600 dark:text-gray-400">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-2">状态码</th>
                <th className="text-left py-2">说明</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b dark:border-gray-700">
                <td className="py-2">400</td>
                <td className="py-2">请求参数错误</td>
              </tr>
              <tr className="border-b dark:border-gray-700">
                <td className="py-2">401</td>
                <td className="py-2">未登录或 token 无效</td>
              </tr>
              <tr className="border-b dark:border-gray-700">
                <td className="py-2">403</td>
                <td className="py-2">无权限访问</td>
              </tr>
              <tr className="border-b dark:border-gray-700">
                <td className="py-2">404</td>
                <td className="py-2">资源不存在</td>
              </tr>
              <tr>
                <td className="py-2">500</td>
                <td className="py-2">服务器内部错误</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
