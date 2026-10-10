import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface DbExistsModalProps {
  isOpen: boolean;
  onConnect: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

function DbExistsModal({ isOpen, onConnect, onDelete, onCancel }: DbExistsModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          数据库已存在
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          该数据库中已有数据表，请选择操作方式：
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConnect}
            className="btn-secondary flex-1"
          >
            连接现有数据
          </button>
          <button
            onClick={onDelete}
            className="btn-primary flex-1 bg-red-600 hover:bg-red-700"
          >
            删除并初始化
          </button>
        </div>
        <button
          onClick={onCancel}
          className="mt-3 w-full text-center text-sm text-gray-500 hover:text-gray-600"
        >
          取消
        </button>
      </div>
    </div>
  );
}

export function Setup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDbExistsModal, setShowDbExistsModal] = useState(false);
  const [, setDbExists] = useState(false);

  const [formData, setFormData] = useState({
    dbHost: '192.168.1.141',
    dbPort: 3306,
    dbUser: 'zhanglj',
    dbPassword: '', // 🔒 不要预填凭据, 强制用户输入
    dbName: 'personal_blog',
    adminEmail: '', // 🔒 不要预填 admin 邮箱, 强制用户输入
    adminPassword: '', // 🔒 不要预填 admin 密码, 强制用户输入
    nickname: '管理员',
  });

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await axios.get('/api/system/status');
      const { dbConfigured, dbConnected, hasUsers } = res.data.data;

      if (dbConfigured && dbConnected && hasUsers) {
        navigate('/login');
      }
    } catch (error) {
      console.error('Failed to check status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const res = await axios.post('/api/setup/test-connection', {
        dbHost: formData.dbHost,
        dbPort: formData.dbPort,
        dbUser: formData.dbUser,
        dbPassword: formData.dbPassword,
        dbName: formData.dbName,
      });
      
      if (res.data.data?.exists) {
        setDbExists(true);
        setShowDbExistsModal(true);
      } else {
        setMessage({ type: 'success', text: res.data.message });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || '连接失败' });
    } finally {
      setTesting(false);
    }
  };

  const handleConnectExisting = async () => {
    setInitializing(true);
    setMessage(null);
    try {
      const res = await axios.post('/api/setup/connect', formData);
      setMessage({ type: 'success', text: res.data.message });
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || '连接失败' });
    } finally {
      setInitializing(false);
      setShowDbExistsModal(false);
    }
  };

  const handleDeleteAndInit = async () => {
    setInitializing(true);
    setMessage(null);
    try {
      const res = await axios.post('/api/setup/init', formData);
      setMessage({ type: 'success', text: res.data.message });
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || '初始化失败' });
    } finally {
      setInitializing(false);
      setShowDbExistsModal(false);
    }
  };

  const handleInitialize = async () => {
    // 先测试连接，检查数据库是否存在
    setTesting(true);
    setMessage(null);
    try {
      const res = await axios.post('/api/setup/test-connection', {
        dbHost: formData.dbHost,
        dbPort: formData.dbPort,
        dbUser: formData.dbUser,
        dbPassword: formData.dbPassword,
        dbName: formData.dbName,
      });
      
      if (res.data.data?.exists) {
        setDbExists(true);
        setShowDbExistsModal(true);
      } else {
        // 数据库不存在，直接初始化
        setInitializing(true);
        const initRes = await axios.post('/api/setup/init', formData);
        setMessage({ type: 'success', text: initRes.data.message });
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || '连接失败' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            系统初始化
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            配置数据库连接信息
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow rounded-lg">
          {message && (
            <div className={`mb-4 p-4 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {message.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                数据库主机
              </label>
              <input
                type="text"
                value={formData.dbHost}
                onChange={(e) => setFormData({ ...formData, dbHost: e.target.value })}
                className="input mt-1"
                placeholder="192.168.1.141"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                数据库端口
              </label>
              <input
                type="number"
                value={formData.dbPort}
                onChange={(e) => setFormData({ ...formData, dbPort: parseInt(e.target.value) })}
                className="input mt-1"
                placeholder="3306"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                数据库用户名
              </label>
              <input
                type="text"
                value={formData.dbUser}
                onChange={(e) => setFormData({ ...formData, dbUser: e.target.value })}
                className="input mt-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                数据库密码
              </label>
              <input
                type="password"
                value={formData.dbPassword}
                onChange={(e) => setFormData({ ...formData, dbPassword: e.target.value })}
                className="input mt-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                数据库名称
              </label>
              <input
                type="text"
                value={formData.dbName}
                onChange={(e) => setFormData({ ...formData, dbName: e.target.value })}
                className="input mt-1"
              />
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                管理员账户
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  管理员邮箱
                </label>
                <input
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  className="input mt-1"
                />
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  管理员密码
                </label>
                <input
                  type="password"
                  value={formData.adminPassword}
                  onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                  className="input mt-1"
                />
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  管理员昵称
                </label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  className="input mt-1"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="btn-secondary flex-1"
              >
                {testing ? '测试中...' : '测试连接'}
              </button>
              <button
                onClick={handleInitialize}
                disabled={initializing}
                className="btn-primary flex-1"
              >
                {initializing ? '初始化中...' : '初始化'}
              </button>
            </div>
          </div>
        </div>

        <DbExistsModal
          isOpen={showDbExistsModal}
          onConnect={handleConnectExisting}
          onDelete={handleDeleteAndInit}
          onCancel={() => setShowDbExistsModal(false)}
        />
      </div>
    </div>
  );
}
