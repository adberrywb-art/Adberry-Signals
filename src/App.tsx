import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Settings, 
  History, 
  LogOut, 
  User, 
  Lock, 
  Send, 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  Zap,
  BarChart3,
  Bell,
  Key
} from 'lucide-react';
import { AccountConfig, Signal } from './types';

// --- Components ---

const Navbar = ({ activeTab, setActiveTab, onLogout }: { activeTab: string, setActiveTab: (t: string) => void, onLogout: () => void }) => (
  <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-white/10 px-6 py-4 md:relative md:border-t-0 md:border-r md:w-64 md:h-screen flex md:flex-col justify-around md:justify-start gap-8 z-50">
    <div className="hidden md:flex items-center gap-3 mb-12 px-2">
      <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/20">
        <Zap className="text-white w-6 h-6 fill-current" />
      </div>
      <span className="text-xl font-bold tracking-tight text-white">Adberry</span>
    </div>
    
    {[
      { id: 'dashboard', icon: TrendingUp, label: 'Panel' },
      { id: 'config', icon: Settings, label: 'Configuración' },
      { id: 'history', icon: History, label: 'Historial' },
    ].map((item) => (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${
          activeTab === item.id 
            ? 'bg-red-600/10 text-red-500 shadow-inner' 
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
        }`}
      >
        <item.icon size={22} />
        <span className="hidden md:inline font-medium">{item.label}</span>
      </button>
    ))}

    <div className="mt-auto hidden md:block px-2">
      <button 
        onClick={onLogout}
        className="flex items-center gap-4 px-4 py-3 text-zinc-500 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all w-full"
      >
        <LogOut size={22} />
        <span className="font-medium">Cerrar Sesión</span>
      </button>
    </div>
  </nav>
);

const Dashboard = ({ signals, config, onToggle }: { signals: Signal[], config: AccountConfig, onToggle: (v: boolean) => void }) => (
  <div className="space-y-8 animate-in fade-in duration-700">
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Panel de Control</h1>
        <p className="text-zinc-500 mt-1">Monitorea tus señales en tiempo real (Foco: EURUSD)</p>
      </div>
      <div className="flex items-center gap-4 bg-zinc-900/50 p-2 rounded-2xl border border-white/5">
        <div className="px-4 py-2">
          <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Estado del Bot</span>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full animate-pulse ${config.is_active ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-zinc-700'}`} />
            <span className={`font-semibold ${config.is_active ? 'text-red-500' : 'text-zinc-500'}`}>
              {config.is_active ? 'ACTIVO' : 'INACTIVO'}
            </span>
          </div>
        </div>
        <button 
          onClick={() => onToggle(!config.is_active)}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${
            config.is_active 
              ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' 
              : 'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-600/20'
          }`}
        >
          {config.is_active ? 'Detener' : 'Iniciar'}
        </button>
      </div>
    </header>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-3xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-red-600/10 rounded-2xl text-red-500">
            <Activity size={24} />
          </div>
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-tighter">Total Señales</span>
        </div>
        <div className="text-4xl font-bold text-white tracking-tighter">{signals.length}</div>
        <div className="mt-2 text-sm text-zinc-500 flex items-center gap-1">
          <TrendingUp size={14} className="text-red-500" />
          <span className="text-red-500 font-medium">+8%</span> este mes
        </div>
      </div>

      <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-3xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-red-600/10 rounded-2xl text-red-500">
            <CheckCircle2 size={24} />
          </div>
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-tighter">Ejecutadas</span>
        </div>
        <div className="text-4xl font-bold text-white tracking-tighter">
          {signals.filter(s => s.status.includes('EJECUTADO')).length}
        </div>
        <div className="mt-2 text-sm text-zinc-500">Tasa de éxito: 87%</div>
      </div>

      <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-3xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-red-600/10 rounded-2xl text-red-500">
            <BarChart3 size={24} />
          </div>
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-tighter">Balance Estimado</span>
        </div>
        <div className="text-4xl font-bold text-white tracking-tighter">$1,240.50</div>
        <div className="mt-2 text-sm text-zinc-500">Lotaje actual: {config.lot_size || 0.01}</div>
      </div>
    </div>

    <div className="bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Bell size={20} className="text-zinc-400" />
          Últimas Señales
        </h3>
        <button className="text-sm text-red-500 font-medium hover:underline">Ver todo</button>
      </div>
      <div className="divide-y divide-white/5">
        {signals.slice(0, 5).map((signal) => (
          <div key={signal.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
                signal.type === 'BUY' ? 'bg-red-600/10 text-red-500' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {signal.type === 'BUY' ? 'B' : 'S'}
              </div>
              <div>
                <div className="font-bold text-white">{signal.symbol}</div>
                <div className="text-xs text-zinc-500">{new Date(signal.timestamp).toLocaleString()}</div>
              </div>
            </div>
            <div className="flex gap-8 text-right hidden md:flex">
              <div>
                <div className="text-xs text-zinc-500 uppercase font-bold">SL</div>
                <div className="text-sm font-mono text-zinc-300">{signal.sl || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase font-bold">TP</div>
                <div className="text-sm font-mono text-zinc-300">{signal.tp || 'N/A'}</div>
              </div>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold text-zinc-400 uppercase tracking-widest border border-white/5">
                {signal.status}
              </span>
            </div>
          </div>
        ))}
        {signals.length === 0 && (
          <div className="p-12 text-center text-zinc-500">
            No hay señales detectadas aún.
          </div>
        )}
      </div>
    </div>
  </div>
);

const Config = ({ config, onSave }: { config: AccountConfig, onSave: (c: AccountConfig) => Promise<boolean> }) => {
  const [formData, setFormData] = useState(config);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSave(formData);
    setIsSaving(false);
  };

  return (
    <div className="max-w-4xl space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-bold text-white tracking-tight">Configuración</h1>
        <p className="text-zinc-500 mt-1">Vincula tus cuentas de MT5 y Telegram</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-zinc-900/40 border border-white/5 p-8 rounded-3xl space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
              <ShieldCheck size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">MetaTrader 5</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Número de Cuenta</label>
              <input 
                type="text" 
                value={formData.mt5_account || ''}
                onChange={e => setFormData({...formData, mt5_account: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 outline-none transition-all"
                placeholder="Ej: 12345678"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Contraseña</label>
              <input 
                type="password" 
                value={formData.mt5_password || ''}
                onChange={e => setFormData({...formData, mt5_password: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Servidor</label>
              <input 
                type="text" 
                value={formData.mt5_server || ''}
                onChange={e => setFormData({...formData, mt5_server: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 outline-none transition-all"
                placeholder="Ej: MetaQuotes-Demo"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Lotaje (Volumen)</label>
              <input 
                type="number" 
                step="0.01"
                min="0.01"
                value={formData.lot_size || 0.01}
                onChange={e => setFormData({...formData, lot_size: parseFloat(e.target.value)})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 outline-none transition-all"
                placeholder="0.01"
              />
            </div>
          </div>
        </section>

        <section className="bg-zinc-900/40 border border-white/5 p-8 rounded-3xl space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-sky-500/10 rounded-xl text-sky-400">
              <Send size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">Telegram Bot</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Bot Token</label>
              <input 
                type="text" 
                value={formData.telegram_token || ''}
                onChange={e => setFormData({...formData, telegram_token: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 outline-none transition-all"
                placeholder="123456789:ABCdef..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Chat ID</label>
              <input 
                type="text" 
                value={formData.telegram_chat_id || ''}
                onChange={e => setFormData({...formData, telegram_chat_id: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 outline-none transition-all"
                placeholder="-100123456789"
              />
            </div>
            <div className="p-4 bg-red-600/5 border border-red-600/10 rounded-2xl">
              <p className="text-xs text-red-500/80 leading-relaxed">
                <AlertCircle size={12} className="inline mr-1 mb-0.5" />
                Asegúrate de que el bot sea administrador del canal o grupo para poder leer los mensajes.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-zinc-900/40 border border-white/5 p-8 rounded-3xl space-y-6 md:col-span-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
              <Key size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">MetaApi (Opcional)</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">MetaApi Token</label>
              <input 
                type="text" 
                value={formData.metaapi_token || ''}
                onChange={e => setFormData({...formData, metaapi_token: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 outline-none transition-all"
                placeholder="Tu token de metaapi.cloud"
              />
              <p className="text-[10px] text-zinc-500 mt-2 ml-1">
                * Solo necesario si vas a usar la ejecución en la nube. Si usas el script de Python local, deja este campo vacío.
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-red-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-red-500 transition-all shadow-xl shadow-red-600/10 active:scale-95 disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
          {isSaving ? 'Verificando...' : 'Guardar y Verificar'}
        </button>
      </div>
    </div>
  );
};

const Auth = ({ onLogin }: { onLogin: (token: string) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        setError('El servidor no respondió con JSON. Por favor recarga la página.');
        return;
      }
      
      const data = await res.json();
      if (res.ok) {
        if (isLogin) {
          onLogin(data.token);
        } else {
          setIsLogin(true);
          setError('Registro exitoso. Por favor inicia sesión.');
        }
      } else {
        setError(data.error || 'Algo salió mal');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_50%_50%,rgba(220,38,38,0.05),transparent_50%)]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900/50 border border-white/5 p-10 rounded-[40px] backdrop-blur-xl shadow-2xl"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-600/20 mb-6">
            <Zap className="text-white w-10 h-10 fill-current" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter">Adberry Signals</h1>
          <p className="text-zinc-500 mt-2 text-center">Automatiza tu trading con precisión</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-500 uppercase ml-1">Usuario</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-red-600/50 transition-all"
                placeholder="Tu usuario"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-500 uppercase ml-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-red-600/50 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className={`p-4 rounded-2xl text-sm font-medium ${error.includes('exitoso') ? 'bg-red-600/10 text-red-500' : 'bg-red-600/10 text-red-500'}`}>
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-red-500 transition-all shadow-xl shadow-red-600/10 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Procesando...' : (isLogin ? 'Entrar' : 'Registrarse')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-zinc-400 hover:text-white text-sm font-medium transition-colors"
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  console.log("App component rendering...");
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [signals, setSignals] = useState<Signal[]>([]);
  const [config, setConfig] = useState<AccountConfig>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchData();
      const interval = setInterval(fetchData, 10000); // Poll every 10s
      return () => clearInterval(interval);
    }
  }, [token]);

  const fetchData = async () => {
    try {
      const [sigRes, confRes] = await Promise.all([
        fetch('/api/signals', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/account', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (sigRes.ok && confRes.ok) {
        const sigContentType = sigRes.headers.get("content-type");
        const confContentType = confRes.headers.get("content-type");
        
        if (sigContentType?.includes("application/json") && confContentType?.includes("application/json")) {
          setSignals(await sigRes.json());
          setConfig(await confRes.json());
        } else {
          console.error("Received non-JSON response from API. This might be a security check or a 404 page.");
        }
      } else if (sigRes.status === 401 || confRes.status === 401) {
        handleLogout();
      }
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  const handleSaveConfig = async (newConfig: AccountConfig) => {
    try {
      const res = await fetch('/api/account', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newConfig)
      });
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        alert('❌ El servidor no respondió con JSON. Por favor recarga la página.');
        return false;
      }
      
      const data = await res.json();
      if (res.ok) {
        setConfig(newConfig);
        alert('✅ Conexión verificada y configuración guardada exitosamente.');
        return true;
      } else {
        alert(`❌ Error de verificación: ${data.error}`);
        return false;
      }
    } catch (e) {
      alert('❌ Error al conectar con el servidor');
      return false;
    }
  };

  const handleToggleBot = async (active: boolean) => {
    try {
      const res = await fetch('/api/account/toggle', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ active })
      });
      
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          setConfig({ ...config, is_active: active ? 1 : 0 });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading && token) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin" />
          <p className="text-zinc-500 font-medium animate-pulse">Cargando Adberry...</p>
        </div>
      </div>
    );
  }

  if (!token) return <Auth onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row font-sans selection:bg-red-600/30">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      
      <main className="flex-1 p-6 md:p-12 pb-32 md:pb-12 overflow-y-auto max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Dashboard signals={signals} config={config} onToggle={handleToggleBot} />
            </motion.div>
          )}
          
          {activeTab === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Config config={config} onSave={handleSaveConfig} />
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="space-y-8">
                <header>
                  <h1 className="text-3xl font-bold text-white tracking-tight">Historial de Señales</h1>
                  <p className="text-zinc-500 mt-1">Registro completo de ejecuciones</p>
                </header>
                <div className="bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden">
                  <div className="divide-y divide-white/5">
                    {signals.map((signal) => (
                      <div key={signal.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
                            signal.type === 'BUY' ? 'bg-red-600/10 text-red-500' : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            {signal.type === 'BUY' ? 'B' : 'S'}
                          </div>
                          <div>
                            <div className="font-bold text-white">{signal.symbol}</div>
                            <div className="text-xs text-zinc-500">{new Date(signal.timestamp).toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="hidden md:block max-w-xs truncate text-sm text-zinc-400 italic">
                          "{signal.message}"
                        </div>
                        <div className="text-right">
                          <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold text-zinc-400 uppercase tracking-widest border border-white/5">
                            {signal.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
