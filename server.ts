import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Telegraf } from "telegraf";
import MetaApi from 'metaapi.cloud-sdk';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "adberry-secret-key-2024";

console.log("Starting Adberry Signals Server...");

// Database Setup
const db = new Database("adberry.db");

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    mt5_account TEXT,
    mt5_password TEXT,
    mt5_server TEXT,
    telegram_token TEXT,
    telegram_chat_id TEXT,
    metaapi_token TEXT,
    lot_size REAL DEFAULT 0.01,
    is_active INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    message TEXT,
    type TEXT,
    symbol TEXT,
    entry_price REAL,
    sl REAL,
    tp REAL,
    status TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Migration: Ensure all columns exist in accounts table
try {
  const columns = db.prepare("PRAGMA table_info(accounts)").all() as any[];
  const columnNames = columns.map(col => col.name);
  
  const requiredColumns = [
    { name: 'metaapi_token', type: 'TEXT' },
    { name: 'lot_size', type: 'REAL DEFAULT 0.01' },
    { name: 'is_active', type: 'INTEGER DEFAULT 0' }
  ];

  for (const col of requiredColumns) {
    if (!columnNames.includes(col.name)) {
      db.exec(`ALTER TABLE accounts ADD COLUMN ${col.name} ${col.type}`);
      console.log(`Migration: Added ${col.name} column to accounts table`);
    }
  }
} catch (e) {
  console.error("Migration error:", e);
}

app.use(express.json());

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- API Routes ---

// Auth
app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    const result = stmt.run(username, hashedPassword);
    res.json({ success: true, userId: result.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: "Usuario ya existe" });
  }
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;

  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.json({ token, username: user.username });
  } else {
    res.status(401).json({ error: "Credenciales inválidas" });
  }
});

// Account Config
app.get("/api/account", authenticateToken, (req: any, res) => {
  const account = db.prepare("SELECT * FROM accounts WHERE user_id = ?").get(req.user.id);
  res.json(account || {});
});

app.post("/api/account", authenticateToken, async (req: any, res) => {
  try {
    const { mt5_account, mt5_password, mt5_server, telegram_token, telegram_chat_id, metaapi_token, lot_size } = req.body;
    
    // 1. Verify Telegram Token
    let telegram_status = "error";
    try {
      if (telegram_token) {
        const bot = new Telegraf(telegram_token);
        const me = await bot.telegram.getMe();
        telegram_status = "ok";
        console.log(`Bot verified: @${me.username}`);
      }
    } catch (e: any) {
      return res.status(400).json({ error: `Telegram: ${e.message || "Token inválido"}` });
    }

    // 2. MT5 Basic Validation
    if (!mt5_account || !mt5_password || !mt5_server) {
      return res.status(400).json({ error: "Faltan credenciales de MT5" });
    }

    const existing = db.prepare("SELECT id FROM accounts WHERE user_id = ?").get(req.user.id);

    if (existing) {
      db.prepare(`
        UPDATE accounts SET 
        mt5_account = ?, mt5_password = ?, mt5_server = ?, telegram_token = ?, telegram_chat_id = ?, metaapi_token = ?, lot_size = ?
        WHERE user_id = ?
      `).run(mt5_account, mt5_password, mt5_server, telegram_token, telegram_chat_id, metaapi_token, lot_size || 0.01, req.user.id);
    } else {
      db.prepare(`
        INSERT INTO accounts (user_id, mt5_account, mt5_password, mt5_server, telegram_token, telegram_chat_id, metaapi_token, lot_size)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(req.user.id, mt5_account, mt5_password, mt5_server, telegram_token, telegram_chat_id, metaapi_token, lot_size || 0.01);
    }
    
    // Restart bot listener for this user
    await setupTelegramBot(req.user.id, telegram_token, telegram_chat_id);
    
    res.json({ success: true, telegram_status });
  } catch (err: any) {
    console.error("Error in /api/account:", err);
    res.status(500).json({ error: err.message || "Error interno del servidor" });
  }
});

app.post("/api/account/toggle", authenticateToken, (req: any, res) => {
  const { active } = req.body;
  db.prepare("UPDATE accounts SET is_active = ? WHERE user_id = ?").run(active ? 1 : 0, req.user.id);
  res.json({ success: true });
});

// Signals
app.get("/api/signals", authenticateToken, (req: any, res) => {
  const signals = db.prepare("SELECT * FROM signals WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50").all(req.user.id);
  res.json(signals);
});

// --- Telegram Bot Logic ---
const activeBots = new Map<number, Telegraf>();

function parseSignal(text: string) {
  const lowerText = text.toLowerCase();
  let type = "";
  
  // 1. Detect Action
  if (lowerText.includes("buy now") || lowerText.includes("compra") || lowerText.includes("buy")) type = "BUY";
  if (lowerText.includes("sell now") || lowerText.includes("venta") || lowerText.includes("sell")) type = "SELL";

  if (!type) return null;

  // 2. Detect SL and TP
  const slMatch = text.match(/(?:sl|stop loss|stoploss)[:\s]+([\d.]+)/i);
  const tpMatch = text.match(/(?:tp|take profit|takeprofit)[:\s]+([\d.]+)/i);
  
  // 3. Detect Symbol (Improved: Skip the action word and common noise)
  const words = text.split(/[\s,:]+/);
  let symbol = "EURUSD"; // Default to EURUSD as requested
  
  for (const word of words) {
    const cleanWord = word.replace(/[^A-Z0-9.]/gi, "").toUpperCase();
    // A valid symbol should be 3-12 chars, not the action type, and not common words
    if (
      cleanWord.length >= 3 && 
      cleanWord !== type && 
      cleanWord !== "NOW" && 
      cleanWord !== "LIMIT" && 
      cleanWord !== "STOP" &&
      !/^\d+$/.test(cleanWord) // Not just numbers (unless it's a crypto like 1000PEPE)
    ) {
      symbol = cleanWord;
      break;
    }
  }

  return {
    type,
    symbol,
    sl: slMatch ? parseFloat(slMatch[1]) : null,
    tp: tpMatch ? parseFloat(tpMatch[1]) : null,
    message: text
  };
}

// --- Internal Bridge API (for Python/MT5) ---
app.get("/api/bridge/pending", (req, res) => {
  try {
    const signals = db.prepare("SELECT * FROM signals WHERE status = 'PENDIENTE' ORDER BY timestamp ASC").all();
    res.json(signals);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/bridge/update", (req, res) => {
  try {
    const { id, status } = req.body;
    db.prepare("UPDATE signals SET status = ? WHERE id = ?").run(status, id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Catch-all for unmatched API routes to prevent returning HTML
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

// --- MT5 Execution Logic ---
async function executeTradeOnMT5(userId: number, signal: any) {
  const account = db.prepare("SELECT * FROM accounts WHERE user_id = ?").get(userId) as any;
  if (!account || !account.mt5_account) {
    return { success: false, error: "Cuenta MT5 no configurada" };
  }

  // Si hay MetaApi Token, intentamos ejecución directa en la nube
  if (account.metaapi_token) {
    try {
      console.log(`[Usuario ${userId}] Intentando ejecución vía MetaApi Cloud...`);
      const api = new MetaApi(account.metaapi_token);
      
      // Buscamos la cuenta en MetaApi
      const accounts = await (api.metatraderAccountApi as any).getAccounts();
      const mtAccount = accounts.find((a: any) => a.login === account.mt5_account);
      
      if (mtAccount) {
        if (mtAccount.state !== 'DEPLOYED') {
          return { success: false, error: "La cuenta en MetaApi no está desplegada (DEPLOYED)" };
        }
        
        const connection = await mtAccount.connect();
        await connection.waitConnected();
        
        const action = signal.type === 'BUY' ? 'ORDER_TYPE_BUY' : 'ORDER_TYPE_SELL';
        
        const result = await connection.createMarketOrder(
          signal.symbol, 
          action as any, 
          account.lot_size || 0.01, 
          { 
            stopLoss: signal.sl || undefined, 
            takeProfit: signal.tp || undefined,
            comment: 'Adberry Cloud'
          }
        );
        
        console.log(`[Usuario ${userId}] Éxito en MetaApi:`, result);
        return { success: true, isPending: false };
      } else {
        console.log(`[Usuario ${userId}] Cuenta no encontrada en MetaApi, usando Bridge local...`);
      }
    } catch (e: any) {
      console.error(`[Usuario ${userId}] Error MetaApi:`, e.message);
      // Si falla MetaApi, no bloqueamos, dejamos que intente por el Bridge local
    }
  }

  // Fallback: Guardamos la señal como PENDIENTE para que el script de Python o el EA la recoja
  console.log(`[Usuario ${userId}] Señal puesta en cola para el Bridge (Local/EA): ${signal.type} ${signal.symbol}`);
  return { success: true, isPending: true };
}

async function setupTelegramBot(userId: number, token: string, chatId: string) {
  if (!token || !chatId) return;

  // Stop existing bot if any
  if (activeBots.has(userId)) {
    try {
      const oldBot = activeBots.get(userId);
      if (oldBot) {
        console.log(`[Usuario ${userId}] Deteniendo instancia anterior del bot...`);
        oldBot.stop();
        activeBots.delete(userId);
        // Esperar un momento para que Telegram libere la conexión
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (e) {
      console.error(`[Usuario ${userId}] Error al detener bot anterior:`, e);
    }
  }

  try {
    const bot = new Telegraf(token);
    
    bot.command("start", (ctx) => {
      ctx.reply(`👋 ¡Hola! Soy tu bot de Adberry.\n\nTu Chat ID es: ${ctx.chat.id}\n\nAsegúrate de poner este ID en la configuración de la web.`);
    });

    bot.command("id", (ctx) => {
      ctx.reply(`Tu Chat ID es: ${ctx.chat.id}`);
    });

    bot.on("text", (ctx) => {
      const messageChatId = ctx.chat.id.toString();
      
      // Si el ID no coincide, ignoramos pero podemos loguear para debug
      if (messageChatId !== chatId) {
        console.log(`[Usuario ${userId}] Mensaje recibido de Chat ID incorrecto: ${messageChatId} (Esperado: ${chatId})`);
        return;
      }

      const signal = parseSignal(ctx.message.text);
      if (signal) {
        console.log(`[Usuario ${userId}] Señal detectada: ${signal.type} ${signal.symbol}`);
        
        executeTradeOnMT5(userId, signal).then(result => {
          let status = "ERROR";
          if (result.success) {
            status = result.isPending ? "PENDIENTE" : "EJECUTADO REAL";
            ctx.reply(`✅ Señal recibida y puesta en cola: ${signal.type} ${signal.symbol}`);
          } else {
            status = `ERROR: ${result.error}`;
            ctx.reply(`❌ Error al procesar señal: ${result.error}`);
          }
          
          db.prepare(`
            INSERT INTO signals (user_id, message, type, symbol, sl, tp, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(userId, signal.message, signal.type, signal.symbol, signal.sl, signal.tp, status);
        });
      } else {
        console.log(`[Usuario ${userId}] Mensaje recibido pero no parece una señal: "${ctx.message.text}"`);
      }
    });

    // Intentar lanzar el bot
    try {
      await bot.launch();
      activeBots.set(userId, bot);
      const me = await bot.telegram.getMe();
      console.log(`✅ Bot @${me.username} iniciado correctamente para el usuario ${userId}`);
    } catch (launchError: any) {
      if (launchError.response?.error_code === 409) {
        console.warn(`[Usuario ${userId}] Conflicto 409 detectado. Reintentando en 5 segundos...`);
        setTimeout(() => setupTelegramBot(userId, token, chatId), 5000);
      } else {
        throw launchError;
      }
    }
  } catch (e: any) {
    console.error(`❌ Error al configurar bot para el usuario ${userId}:`, e.message);
    throw e;
  }
}

// --- Vite Integration ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Initialize bots for active accounts after server is up
    try {
      console.log("Initializing active bots...");
      const activeAccounts = db.prepare("SELECT * FROM accounts WHERE telegram_token IS NOT NULL AND telegram_chat_id IS NOT NULL").all() as any[];
      console.log(`Found ${activeAccounts.length} active accounts to initialize.`);
      activeAccounts.forEach(acc => {
        setupTelegramBot(acc.user_id, acc.telegram_token, acc.telegram_chat_id).catch(err => {
          console.error(`Failed to start bot for user ${acc.user_id}:`, err);
        });
      });
    } catch (e) {
      console.error("Error during initial bot startup:", e);
    }
  });
}

startServer();
