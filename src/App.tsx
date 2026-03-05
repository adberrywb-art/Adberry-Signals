/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Settings, 
  LogOut, 
  User, 
  Bell, 
  Activity, 
  DollarSign, 
  BarChart3,
  ShieldCheck,
  Zap,
  ChevronRight,
  RefreshCw,
  Send,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

// --- Types ---
interface UserData {
  id: number;
  username: string;
  telegram_token?: string;
  chat_id?: string;
  lot_size: number;
  balance: number;
}

interface Signal {
  id: number;
  pair: string;
  type: 'BUY' | 'SELL';
  entry_price: number;
  sl: number;
  tp: number;
  status: string;
  result?: 'WIN' | 'LOSS';
  profit?: number;
  timestamp: string;
}

// --- Components ---

const Login = ({ onLogin }: { onLogin: (token: string, user: any) => void }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        if (res.ok) {
          if (isRegister) {
            setIsRegister(false);
            setError('Registro exitoso. Por favor inicia sesión.');
          } else {
            onLogin(data.token, data.user);
          }
        } else {
          setError(data.error || 'Algo salió mal');
        }
      } else {
        setError('Error del servidor (respuesta no válida)');
      }
    } catch (err) {
      setError('Error de conexión');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#141414] border border-red-900/30 rounded-2xl p-8 shadow-2xl shadow-red-900/10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-red-600/20">
            <Zap className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Adberry Signals</h1>
          <p className="text-gray-400 mt-2 text-sm">Tu puente automático a TradingView</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Usuario</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
              placeholder="Ingresa tu usuario"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-red-500 text-xs mt-2 bg-red-500/10 p-2 rounded border border-red-500/20">{error}</p>}
          <button 
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-[0.98]"
          >
            {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsRegister(!isRegister)}
            className="text-gray-400 hover:text-red-500 text-sm transition-colors"
          >
            {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate gratis'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Dashboard = ({ token, onLogout }: { token: string, onLogout: () => void }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [view, setView] = useState<'dashboard' | 'settings'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [showToken, setShowToken] = useState(false);
  const [testStatus, setTestStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'error', message?: string }>({ status: 'idle' });

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    telegram_token: '',
    chat_id: '',
    lot_size: 0.01,
    balance: 1000
  });

  const fetchData = async (isInitial = false) => {
    try {
      const [userRes, signalsRes] = await Promise.all([
        isInitial ? fetch('/api/user/settings', { headers: { 'Authorization': `Bearer ${token}` } }) : Promise.resolve(null),
        fetch('/api/signals', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (userRes && userRes.ok) {
        const contentType = userRes.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const userData = await userRes.json();
          setUser(userData);
          setSettingsForm({
            telegram_token: userData.telegram_token || '',
            chat_id: userData.chat_id || '',
            lot_size: userData.lot_size,
            balance: userData.balance
          });
        }
      }

      if (signalsRes.ok) {
        const contentType = signalsRes.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const signalsData = await signalsRes.json();
          setSignals(signalsData);
        }
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 5000);
    return () => clearInterval(interval);
  }, [token]);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settingsForm),
      });
      if (res.ok) {
        alert('Configuración actualizada');
        fetchData();
      }
    } catch (err) {
      alert('Error al actualizar');
    }
  };

  const handleTestBot = async () => {
    setTestStatus({ status: 'loading' });
    try {
      const res = await fetch('/api/user/test-telegram', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token: settingsForm.telegram_token }),
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        if (res.ok) {
          setTestStatus({ status: 'success', message: `¡Conectado! Bot: @${data.bot_name}` });
        } else {
          setTestStatus({ status: 'error', message: data.error });
        }
      } else {
        setTestStatus({ status: 'error', message: 'Respuesta del servidor no válida' });
      }
    } catch (err) {
      setTestStatus({ status: 'error', message: 'Error de conexión' });
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <RefreshCw className="text-red-600 animate-spin w-10 h-10" />
    </div>
  );

  const winRate = signals.length > 0 
    ? (signals.filter(s => s.result === 'WIN').length / signals.filter(s => s.status === 'CLOSED').length * 100 || 0).toFixed(1)
    : '0.0';

  const chartData = signals.slice().reverse().map((s, i) => ({
    name: i,
    profit: s.profit || 0,
    cumulative: signals.slice(0, i + 1).reduce((acc, curr) => acc + (curr.profit || 0), 0)
  }));

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#141414] border-r border-gray-800 flex flex-col p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/20">
            <Zap className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">Adberry</span>
        </div>

        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-gray-400 hover:bg-gray-800'}`}
          >
            <Activity size={20} />
            <span className="font-medium">Panel Principal</span>
          </button>
          <button 
            onClick={() => setView('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'settings' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-gray-400 hover:bg-gray-800'}`}
          >
            <Settings size={20} />
            <span className="font-medium">Configuración</span>
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
              <User size={20} className="text-gray-400" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{user?.username}</p>
              <p className="text-xs text-gray-500">Trader Pro</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all font-medium"
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          {view === 'dashboard' ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Header Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#141414] p-6 rounded-2xl border border-gray-800 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <DollarSign className="text-emerald-500" size={24} />
                    </div>
                    <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">+2.4%</span>
                  </div>
                  <p className="text-gray-500 text-sm font-medium">Capital Actual</p>
                  <h3 className="text-2xl font-bold mt-1">${user?.balance.toLocaleString()}</h3>
                </div>

                <div className="bg-[#141414] p-6 rounded-2xl border border-gray-800 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <BarChart3 className="text-red-500" size={24} />
                    </div>
                    <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">EURUSD</span>
                  </div>
                  <p className="text-gray-500 text-sm font-medium">Tasa de Éxito</p>
                  <h3 className="text-2xl font-bold mt-1">{winRate}%</h3>
                </div>

                <div className="bg-[#141414] p-6 rounded-2xl border border-gray-800 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Bell className="text-blue-500" size={24} />
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm font-medium">Señales Totales</p>
                  <h3 className="text-2xl font-bold mt-1">{signals.length}</h3>
                </div>

                <div className="bg-[#141414] p-6 rounded-2xl border border-gray-800 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <ShieldCheck className="text-purple-500" size={24} />
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm font-medium">Estado del Bot</p>
                  <h3 className="text-2xl font-bold mt-1 flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${user?.telegram_token ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                    {user?.telegram_token ? 'Activo' : 'Inactivo'}
                  </h3>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-[#141414] p-6 rounded-2xl border border-gray-800">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-bold">Rendimiento de Capital</h4>
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-600 rounded-full"></span> Ganancia Acumulada
                    </span>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="name" hide />
                      <YAxis stroke="#666" fontSize={12} tickFormatter={(v) => `$${v}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Area type="monotone" dataKey="cumulative" stroke="#dc2626" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Signals */}
              <div className="bg-[#141414] rounded-2xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                  <h4 className="text-lg font-bold">Historial de Señales</h4>
                  <button className="text-red-500 text-sm font-medium hover:underline">Ver todas</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                        <th className="px-6 py-4 font-semibold">Par</th>
                        <th className="px-6 py-4 font-semibold">Tipo</th>
                        <th className="px-6 py-4 font-semibold">SL / TP</th>
                        <th className="px-6 py-4 font-semibold">Estado</th>
                        <th className="px-6 py-4 font-semibold">Resultado</th>
                        <th className="px-6 py-4 font-semibold text-right">Beneficio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {signals.map((signal) => (
                        <tr key={signal.id} className="hover:bg-gray-800/50 transition-colors">
                          <td className="px-6 py-4 font-bold">{signal.pair}</td>
                          <td className="px-6 py-4">
                            <span className={`flex items-center gap-1 font-bold ${signal.type === 'BUY' ? 'text-emerald-500' : 'text-red-500'}`}>
                              {signal.type === 'BUY' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                              {signal.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400">
                            {signal.sl || '-'} / {signal.tp || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${signal.status === 'EXECUTED' ? 'bg-blue-500/10 text-blue-500' : 'bg-gray-500/10 text-gray-500'}`}>
                              {signal.status === 'EXECUTED' ? 'Ejecutando' : 'Cerrada'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {signal.result && (
                              <span className={`font-bold ${signal.result === 'WIN' ? 'text-emerald-500' : 'text-red-500'}`}>
                                {signal.result}
                              </span>
                            )}
                          </td>
                          <td className={`px-6 py-4 text-right font-bold ${signal.profit && signal.profit > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {signal.profit ? `${signal.profit > 0 ? '+' : ''}${signal.profit.toFixed(2)}` : '-'}
                          </td>
                        </tr>
                      ))}
                      {signals.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-gray-500">No hay señales registradas aún.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="mb-8">
                <h2 className="text-3xl font-bold mb-2">Configuración</h2>
                <p className="text-gray-400">Vincula tus cuentas y ajusta tu estrategia de trading.</p>
              </div>

              <form onSubmit={handleUpdateSettings} className="space-y-6">
                <div className="bg-[#141414] p-8 rounded-2xl border border-gray-800 space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
                    <Send className="text-red-500" />
                    <h3 className="text-xl font-bold">Conexión Telegram</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bot API Token</label>
                      <div className="relative">
                        <input 
                          type={showToken ? "text" : "password"}
                          value={settingsForm.telegram_token}
                          onChange={(e) => setSettingsForm({...settingsForm, telegram_token: e.target.value})}
                          className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors pr-12"
                          placeholder="782345678:AAH-..."
                        />
                        <button 
                          type="button"
                          onClick={() => setShowToken(!showToken)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                        >
                          {showToken ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Chat ID (Canal/Grupo)</label>
                      <input 
                        type="text" 
                        value={settingsForm.chat_id}
                        onChange={(e) => setSettingsForm({...settingsForm, chat_id: e.target.value})}
                        className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                        placeholder="-100123456789"
                      />
                    </div>
                    <div className="pt-2">
                      <button 
                        type="button"
                        onClick={handleTestBot}
                        disabled={testStatus.status === 'loading'}
                        className="flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        {testStatus.status === 'loading' ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
                        Probar Conexión
                      </button>
                      {testStatus.status !== 'idle' && (
                        <div className={`mt-2 flex items-center gap-2 text-xs font-medium p-3 rounded-lg border ${testStatus.status === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                          {testStatus.status === 'success' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {testStatus.message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-[#141414] p-8 rounded-2xl border border-gray-800 space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
                    <Globe className="text-red-500" />
                    <h3 className="text-xl font-bold">Integración TradingView</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-sm text-gray-400">
                      Usa este Webhook para recibir señales directamente de TradingView. Configura una alerta con el siguiente formato JSON:
                    </p>
                    <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800 font-mono text-[10px] text-gray-300">
                      <code>
                        {`{
  "secret": "adberry-webhook-secret",
  "user_id": ${user?.id},
  "pair": "EURUSD",
  "type": "buy",
  "sl": 1.0800,
  "tp": 1.0950
}`}
                      </code>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Webhook URL</label>
                      <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl px-4 py-3 text-red-500 font-mono text-xs break-all">
                        {window.location.origin}/api/webhook/tradingview
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#141414] p-8 rounded-2xl border border-gray-800 space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
                    <TrendingUp className="text-red-500" />
                    <h3 className="text-xl font-bold">Gestión de Riesgo</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Lotaje Predeterminado</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={settingsForm.lot_size}
                        onChange={(e) => setSettingsForm({...settingsForm, lot_size: parseFloat(e.target.value)})}
                        className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Capital Inicial ($)</label>
                      <input 
                        type="number" 
                        value={settingsForm.balance}
                        onChange={(e) => setSettingsForm({...settingsForm, balance: parseFloat(e.target.value)})}
                        className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={20} />
                  Guardar Cambios
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('adberry_token'));

  const handleLogin = (newToken: string, user: any) => {
    localStorage.setItem('adberry_token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('adberry_token');
    setToken(null);
  };

  return (
    <div className="selection:bg-red-500/30">
      {token ? (
        <Dashboard token={token} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}
