// 行为追踪 SDK

// 兼容 crypto.randomUUID（HTTP 环境下不可用）
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // 降级方案
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface BehaviorEvent {
  sessionId: string;
  deviceId: string;
  eventType: 'page_view' | 'article_view' | 'scroll' | 'click' | 'resize';
  pageUrl: string;
  pageType?: string;
  articleId?: string;
  scrollDepth?: number;
  scrollCount?: number;
  stayDuration?: number;
  clickTarget?: string;
  screenResolution?: string;
  viewportSize?: string;
  referrer?: string;
  ipv4?: string;  // 客户端真实 IPv4
  ipv6?: string;  // 客户端真实 IPv6
  gpsLat?: number;
  gpsLng?: number;
  timestamp: number;
  userId?: string;
}

class BehaviorTracker {
  private sessionId: string;
  private deviceId: string;
  private pageStartTime: number;
  private scrollCount: number = 0;
  private queue: BehaviorEvent[] = [];
  private userId?: string;
  private gpsLat?: number;
  private gpsLng?: number;
  private clientIPv4?: string;
  private clientIPv6?: string;
  
  // 动态配置
  private reportThreshold = 3;
  private reportInterval = 30000;
  private enabled = true;
  
  // 服务端配置缓存（5 分钟 TTL）
  private configCache: { enabled: boolean; expiresAt: number } | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 分钟
  
  // SSE 连接和轮询定时器
  private eventSource: EventSource | null = null;
  private configPollingInterval: ReturnType<typeof setInterval> | null = null;
  private timerId: ReturnType<typeof setInterval> | null = null;
  
  // SSE 连接状态
  private sseConnected = false;
  private sseLastMessageTime: number | null = null;
  
  // SSE 健康检查超时（2 分钟）
  private readonly SSE_HEALTH_TIMEOUT = 2 * 60 * 1000;
  
  // 轮询间隔（SSE 异常时 1 分钟）
  private readonly POLLING_INTERVAL_SSE_ERROR = 60000;

  // 获取客户端公网 IP（通过第三方 API）
  private async fetchClientPublicIP() {
    // 分别获取 IPv4 和 IPv6
    let ipv4: string | undefined;
    let ipv6: string | undefined;
    
    // 获取 IPv4（使用专门的 IPv4 API）
    try {
      const response = await fetch('https://ipv4.icanhazip.com', {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const ip = (await response.text()).trim();
        if (/^[\d.]+$/.test(ip)) {
          ipv4 = ip;
          console.log('[BehaviorTracker] ✅ IPv4:', ip);
        }
      }
    } catch (e) {
      console.debug('[BehaviorTracker] ⚠️ IPv4 API 失败');
    }
    
    // 获取 IPv6（使用专门的 IPv6 API）
    try {
      const response = await fetch('https://ipv6.icanhazip.com', {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const ip = (await response.text()).trim();
        if (/^[\da-f:]+$/i.test(ip)) {
          ipv6 = ip;
          console.log('[BehaviorTracker] ✅ IPv6:', ip);
        }
      }
    } catch (e) {
      console.debug('[BehaviorTracker] ⚠️ IPv6 API 失败');
    }
    
    if (ipv4 || ipv6) {
      console.log('[BehaviorTracker] ✅ 客户端 IP 获取成功:', { ipv4, ipv6 });
    }
    
    return { ipv4, ipv6 };
  }

  constructor() {
    this.sessionId = this.initSessionId();
    this.deviceId = this.initDeviceId();
    this.pageStartTime = Date.now();
    this.setupListeners();
    
    // 获取位置信息（GPS）和客户端 IP
    this.initLocation();
    
    // 页面离开时上报
    window.addEventListener('beforeunload', () => this.reportPageStay());
    
    // 页面卸载时清理资源
    window.addEventListener('unload', () => this.cleanup());
    
    // 加载服务器配置（包含 enabled 开关）
    this.loadConfig();
    
    // 连接 SSE 配置更新推送
    this.connectConfigStream();
    
    // 启动 5 分钟轮询兜底
    this.startConfigPolling();
  }

  // 从服务器加载配置
  private async loadConfig() {
    // 先获取 IP 地址
    const ipInfo = await this.fetchClientPublicIP();
    if (ipInfo) {
      this.clientIPv4 = ipInfo.ipv4;
      this.clientIPv6 = ipInfo.ipv6;
      console.log('[BehaviorTracker] ✅ 客户端 IP:', JSON.stringify(ipInfo));
    }
    
    try {
      const response = await fetch('/api/behavior/client-config', {
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok) {
        const result = await response.json();
        const config = result.data;
        
        this.enabled = config.enabled !== false;
        this.reportThreshold = config.reportThreshold || 3;
        this.reportInterval = (config.reportInterval || 30) * 1000; // 转换为毫秒
        
        console.log('[BehaviorTracker] ✅ 配置已加载:', {
          enabled: this.enabled,
          reportThreshold: this.reportThreshold,
          reportInterval: this.reportInterval / 1000,
        });
        
        // 启动定时上报
        if (this.enabled) {
          this.startReporting();
        } else {
          console.log('[BehaviorTracker] ⚠️ 行为追踪已禁用');
        }
      } else {
        console.log('[BehaviorTracker] ⚠️ 配置加载失败，使用默认配置');
        this.startReporting();
      }
    } catch (error) {
      console.log('[BehaviorTracker] ⚠️ 配置加载失败，使用默认配置');
      // 使用默认配置启动
      this.startReporting();
    }
  }

  // 启动定时上报
  private startReporting() {
    // 启动定时上报
    const startTimer = () => {
      if (this.timerId) clearInterval(this.timerId);
      this.timerId = setInterval(() => {
        this.reportHeartbeat();
        this.flush();
      }, this.reportInterval);
    };
    
    // 如果当前已启用，启动定时器
    if (this.enabled) {
      startTimer();
    }
  }

  // 连接 SSE 配置更新推送
  private connectConfigStream() {
    console.log('[BehaviorTracker] 📡 正在连接 SSE 配置推送...');
    
    // 配置推送使用公开端点（无需认证）
    this.eventSource = new EventSource('/api/logs/config/stream');
    
    // 连接成功回调
    this.eventSource.onopen = () => {
      this.sseConnected = true;
      this.sseLastMessageTime = Date.now();
      console.log('[BehaviorTracker] ✅ SSE 连接已建立');
    };
    
    // 监听所有 SSE 消息（包括 config_update 和 heartbeat）
    this.eventSource.addEventListener('message', (event) => {
      try {
        // 第一时间输出原始 SSE 数据
        console.log('[BehaviorTracker] 📩 收到 SSE 原始消息:', event.data);
        
        const data = JSON.parse(event.data);
        
        // 处理心跳消息
        if (data.type === 'heartbeat') {
          console.debug('[BehaviorTracker] 💓 SSE 心跳正常');
          this.sseConnected = true;
          this.sseLastMessageTime = Date.now();
          return;
        }
        
        // 处理配置更新
        if (data.type === 'config_update') {
          const config = data.config;
          
          // 确认连接正常（每次收到消息都重置状态）
          this.sseConnected = true;
          this.sseLastMessageTime = Date.now();
          
          console.log('[BehaviorTracker] 🔍 解析后的配置:', {
            enabled: config.enabled,
            reportThreshold: config.reportThreshold,
            reportInterval: config.reportInterval
          });
          
          // 更新本地配置
          this.enabled = config.enabled;
          this.reportThreshold = config.reportThreshold;
          this.reportInterval = config.reportInterval * 1000;
          
          // 更新缓存
          this.configCache = {
            enabled: config.enabled,
            expiresAt: Date.now() + this.CACHE_TTL,
          };
          
          // 记录最后收到消息时间
          this.sseLastMessageTime = Date.now();
          
          console.log('[BehaviorTracker] 🔄 SSE 配置已更新:', config);
          console.log('[BehaviorTracker] ✅ 配置应用完成，当前状态:', {
            enabled: this.enabled,
            reportThreshold: this.reportThreshold,
            reportInterval: this.reportInterval
          });
          
          // 如果禁用，清空队列并停止定时器
          if (!config.enabled) {
            this.queue = [];
            if (this.timerId) {
              clearInterval(this.timerId);
              this.timerId = null;
            }
            console.log('[BehaviorTracker] ⏹️ 追踪已禁用，队列已清空');
          } else {
            // 启用则重启定时器
            this.restartTimer();
            console.log('[BehaviorTracker] ▶️ 追踪已启用，定时器已重启');
          }
        }
      } catch (error) {
        console.error('[BehaviorTracker] ❌ SSE 消息解析失败:', error);
        console.error('[BehaviorTracker] 📦 原始数据:', event.data);
      }
    });
    
    // 连接错误回调
    this.eventSource.addEventListener('error', (event) => {
      const es = event.target as EventSource;
      
      // 检查实际连接状态
      if (es.readyState === EventSource.CLOSED) {
        // 真正断开（readyState = 2）
        this.sseConnected = false;
        console.error('[BehaviorTracker] ❌ SSE 连接已关闭（CLOSED），将使用轮询兜底');
      } else if (es.readyState === EventSource.CONNECTING) {
        // 正在重连（readyState = 0），不要误判
        console.debug('[BehaviorTracker] 🔄 SSE 正在重连中（CONNECTING）...');
        // 不修改 sseConnected 状态，保持原状
      } else if (es.readyState === EventSource.OPEN) {
        // 理论上不会触发 error，但以防万一
        console.warn('[BehaviorTracker] ⚠️ SSE 连接状态异常（OPEN 状态收到 error）');
      }
    });
  }

  // 重启定时器（配置变更后调用）
  private restartTimer() {
    if (this.timerId) clearInterval(this.timerId);
    if (this.enabled) {
      this.timerId = setInterval(() => {
        this.reportHeartbeat();
        this.flush();
      }, this.reportInterval);
      console.log('[BehaviorTracker] ⏰ 定时器已重启，间隔:', this.reportInterval / 1000, '秒');
    }
  }

  // 5 分钟轮询兜底
  private startConfigPolling() {
    this.configPollingInterval = setInterval(async () => {
      // 检查 SSE 健康状态（2 分钟内收到消息）
      const sseHealthy = (
        this.sseConnected && 
        this.sseLastMessageTime && 
        Date.now() - this.sseLastMessageTime < this.SSE_HEALTH_TIMEOUT
      );
      
      if (sseHealthy) {
        console.log('[BehaviorTracker] ✅ SSE 健康，跳过轮询');
        return;
      }
      
      console.log('[BehaviorTracker] ⚠️ SSE 异常，执行轮询兜底');
      
      try {
        const response = await fetch('/api/behavior/client-config');
        const config = await response.json();
        
        // 检查配置是否真正变化
        const configChanged = (
          config.data.enabled !== this.enabled ||
          config.data.reportThreshold !== this.reportThreshold ||
          config.data.reportInterval !== this.reportInterval / 1000
        );
        
        // 同步所有配置
        this.enabled = config.data.enabled;
        this.reportThreshold = config.data.reportThreshold;
        this.reportInterval = config.data.reportInterval * 1000;
        this.configCache = {
          enabled: config.data.enabled,
          expiresAt: Date.now() + this.CACHE_TTL,
        };
        
        // 只在配置变化时重启定时器
        if (configChanged) {
          this.restartTimer();
          console.log('[BehaviorTracker] 🔄 轮询兜底同步配置:', config.data);
        }
      } catch (error) {
        console.debug('[BehaviorTracker] 轮询配置失败:', error);
      }
    }, this.POLLING_INTERVAL_SSE_ERROR);
  }

  // 清理资源（页面卸载时调用）
  private cleanup() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.configPollingInterval) {
      clearInterval(this.configPollingInterval);
      this.configPollingInterval = null;
    }
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    // 重置 SSE 状态
    this.sseConnected = false;
    this.sseLastMessageTime = null;
    
    console.log('[BehaviorTracker] 🧹 资源已清理');
  }

  // 初始化位置信息（通过 GPS 获取，不调用 API）
  private async initLocation() {
    console.log('[BehaviorTracker] 开始获取位置信息...');
    console.log('[BehaviorTracker] 是否支持 Geolocation:', 'geolocation' in navigator);
    
    if ('geolocation' in navigator) {
      try {
        console.log('[BehaviorTracker] 请求 GPS 权限...');
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              console.log('[BehaviorTracker] ✅ GPS 获取成功');
              resolve(pos);
            },
            (err) => {
              const errorMessages: Record<number, string> = {
                1: '用户拒绝权限',
                2: '位置不可用',
                3: '超时',
              };
              console.log('[BehaviorTracker] ❌ GPS 获取失败:', errorMessages[err.code] || err.message);
              reject(err);
            },
            {
              enableHighAccuracy: false,  // PC 端不需要高精度（会调用 GPS 硬件）
              timeout: 10000,            // 10 秒超时
              maximumAge: 300000         // 5 分钟缓存
            }
          );
        });

        const { latitude, longitude } = position.coords;
        console.log('[BehaviorTracker] 📍 GPS 坐标:', latitude.toFixed(6), longitude.toFixed(6));
        
        // 只存储 GPS 坐标，不调用高德 API 转换
        this.gpsLat = latitude;
        this.gpsLng = longitude;
        
      } catch (error: any) {
        // GPS 获取失败是常见的（用户拒绝、无 GPS 设备等），静默处理
        console.log('[BehaviorTracker] GPS 获取失败，将继续上报其他数据');
      }
    } else {
      console.log('[BehaviorTracker] ❌ 浏览器不支持 Geolocation API');
    }
  }

  // 设置用户 ID（登录后调用）
  setUserId(userId: string) {
    this.userId = userId;
  }

  // 初始化会话 ID（页面刷新不变，关闭浏览器变化）
  private initSessionId() {
    let id = sessionStorage.getItem('session_id');
    if (!id) {
      id = generateUUID();
      sessionStorage.setItem('session_id', id);
    }
    return id;
  }

  // 初始化设备 ID（长期不变）
  private initDeviceId() {
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = generateUUID();
      localStorage.setItem('device_id', id);
    }
    return id;
  }

  // 监听事件
  private setupListeners() {
    // 滚动监听（节流 500ms）
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    window.addEventListener('scroll', () => {
      if (!this.enabled) return;
      if (scrollTimeout) return;
      scrollTimeout = setTimeout(() => {
        this.trackScroll();
        scrollTimeout = null;
      }, 500);
    });

    // 页面可见性变化（切 tab 时记录）
    document.addEventListener('visibilitychange', () => {
      if (!this.enabled) return;
      if (document.visibilityState === 'hidden') {
        this.reportPageStay();
      } else {
        this.pageStartTime = Date.now();
      }
    });

    // 点击监听（关键元素）
    document.addEventListener('click', (e) => {
      if (!this.enabled) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' || target.tagName === 'BUTTON') {
        this.trackClick(target);
      }
    });

    // 窗口大小变化
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    window.addEventListener('resize', () => {
      if (!this.enabled) return;
      if (resizeTimeout) return;
      resizeTimeout = setTimeout(() => {
        this.report({
          eventType: 'resize',
          pageUrl: window.location.href,
          viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        });
        resizeTimeout = null;
      }, 500);
    });
  }

  // 文章浏览上报
  trackArticleView(articleId: string) {
    this.report({
      eventType: 'article_view',
      articleId,
      pageUrl: window.location.href,
      pageType: 'article',
    });
  }

  // 心跳上报（定时上报当前状态，即使用户没有交互）
  private reportHeartbeat() {
    this.report({
      eventType: 'page_view',
      pageUrl: window.location.href,
      pageType: this.getPageType(),
    });
  }

  // 获取页面类型
  private getPageType(): string {
    const path = window.location.pathname;
    if (path === '/') return 'home';
    if (path.startsWith('/post/')) return 'article';
    if (path.startsWith('/profile')) return 'profile';
    if (path.startsWith('/search')) return 'search';
    if (path.startsWith('/user/')) return 'user';
    if (path.startsWith('/editor/')) return 'editor';
    if (path.startsWith('/admin/')) return 'admin';
    return 'other';
  }

  // 页面浏览上报
  trackPageView(pageType?: string) {
    this.report({
      eventType: 'page_view',
      pageUrl: window.location.href,
      pageType,
      referrer: document.referrer || undefined,
    });
  }

  // 滚动追踪
  private trackScroll() {
    this.scrollCount++;
    const scrollDepth = this.calculateScrollDepth();

    this.report({
      eventType: 'scroll',
      scrollDepth,
      scrollCount: this.scrollCount,
      pageUrl: window.location.href,
    });
  }

  // 计算滚动深度
  private calculateScrollDepth(): number {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    return docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
  }

  // 点击追踪
  private trackClick(target: HTMLElement) {
    this.report({
      eventType: 'click',
      clickTarget: target.tagName + (target.id ? `#${target.id}` : '') + (target.className ? `.${target.className.split(' ').join('.')}` : ''),
      pageUrl: window.location.href,
    });
  }

  // 页面停留时长上报
  private reportPageStay() {
    const duration = Math.floor((Date.now() - this.pageStartTime) / 1000);
    const scrollDepth = this.calculateScrollDepth();

    this.report({
      eventType: 'page_view',
      stayDuration: duration,
      scrollDepth,
      scrollCount: this.scrollCount,
      pageUrl: window.location.href,
    });
  }

  // 上报数据
  private report(data: Omit<BehaviorEvent, 'sessionId' | 'deviceId' | 'timestamp'>) {
    // 如果禁用追踪，不收集数据
    if (!this.enabled) return;
    
    this.queue.push({
      ...data,
      sessionId: this.sessionId,
      deviceId: this.deviceId,
      timestamp: Date.now(),
      userId: this.userId,
      ipv4: data.ipv4 || this.clientIPv4,
      ipv6: data.ipv6 || this.clientIPv6,
      gpsLat: data.gpsLat || this.gpsLat,
      gpsLng: data.gpsLng || this.gpsLng,
      screenResolution: data.screenResolution || `${screen.width}x${screen.height}`,
      viewportSize: data.viewportSize || `${window.innerWidth}x${window.innerHeight}`,
    });

    // 攒够配置条数就上报
    if (this.queue.length >= this.reportThreshold) {
      this.flush();
    }
  }

  // 批量上报
  private async flush() {
    // 如果禁用追踪，不上报数据
    if (!this.enabled) return;
    
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];
    
    // 检查配置缓存是否过期
    if (this.configCache && this.configCache.expiresAt > Date.now()) {
      if (!this.configCache.enabled) {
        // 服务端已禁用，清空队列
        console.log('[BehaviorTracker] ⚠️ 服务端已禁用追踪，清空队列');
        return;
      }
    }

    try {
      // 使用 fetch 获取服务端响应
      const response = await fetch('/api/logs/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
        keepalive: true,
      });
      
      const result = await response.json();
      
      // 根据服务端返回的 enabled 状态更新本地缓存
      if (result.enabled !== undefined) {
        this.configCache = {
          enabled: result.enabled,
          expiresAt: Date.now() + this.CACHE_TTL,
        };
        
        // 如果服务端返回 disabled，停止上报并清空队列
        if (!result.enabled) {
          this.enabled = false;
          console.log('[BehaviorTracker] ⚠️ 服务端已禁用追踪，停止上报');
          return;
        }
      }
      
      console.log('[BehaviorTracker] 上报成功:', events.length, '条');
    } catch (error) {
      console.error('[BehaviorTracker] 上报失败:', error);
      // 失败时恢复队列，等待下次重试
      this.queue = [...events, ...this.queue];
    }
    
    // 页面关闭时降级使用 sendBeacon（不关心响应）
    if (document.visibilityState === 'hidden' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify({ events })], {
        type: 'application/json',
      });
      navigator.sendBeacon('/api/logs/track', blob);
    }
  }
}

// 全局实例
let tracker: BehaviorTracker | null = null;

export function initBehaviorTracker() {
  if (!tracker) {
    tracker = new BehaviorTracker();
  }
  return tracker;
}

export function getTracker() {
  return tracker;
}

export function trackArticleView(articleId: string) {
  tracker?.trackArticleView(articleId);
}

export function trackPageView(pageType?: string) {
  tracker?.trackPageView(pageType);
}

export function setUserId(userId: string) {
  tracker?.setUserId(userId);
}
