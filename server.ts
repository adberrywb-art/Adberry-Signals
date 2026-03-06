import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import TelegramBot from 'node-telegram-bot-api';
import bcrypt from 'bcryptjs';
import { createServer } from 'http';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Railway dynamic port
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DATABASE_URL || path.join(__dirname, 'adberry.db');

// HARDCODED TELEGRAM CREDENTIALS
const TELEGRAM_BOT_TOKEN = '8567907115:AAGlbFcIFc4PmLo60MIy_MrDQs_5xN_AIDI';
const TELEGRAM_CHAT_ID = '6883456927';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const db = new Database(DB_PATH);

  // Initialize Adberry Schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      capital REAL DEFAULT 1000.0,
      lot_size REAL DEFAULT 0.01,
      success_rate REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT, -- BUY/SELL
      pair TEXT DEFAULT 'EURUSD',
      entry_price REAL,
      sl REAL,
      tp REAL,
      status TEXT DEFAULT 'OPEN', -- OPEN, CLOSED, CANCELLED
      profit REAL DEFAULT 0.0,
      result TEXT DEFAULT 'PENDING', -- WIN, LOSS, PENDING
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  app.use(express.json());

  // Socket.io connection
  io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);
    socket.on('disconnect', () => console.log('Cliente desconectado'));
  });

  // Telegram Bot (Global for all users as per request)
  // Use a singleton-like pattern or check if polling is already active
  const shouldPoll = process.env.DISABLE_TELEGRAM_POLLING !== 'true';
  const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: shouldPoll });
  
  if (shouldPoll) {
    console.log('Telegram polling activo...');
    // Handle polling errors (like 409 Conflict)
    bot.on('polling_error', (error: any) => {
      if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
        console.error('⚠️ Conflicto de Telegram: Otra instancia del bot está activa. Deteniendo polling en esta instancia...');
        bot.stopPolling();
      } else {
        console.error('Error de polling de Telegram:', error.message);
      }
    });

    // Clean shutdown
    process.on('SIGINT', () => bot.stopPolling());
    process.on('SIGTERM', () => bot.stopPolling());
  } else {
    console.log('Telegram polling desactivado por variable de entorno.');
  }
  
  bot.on('message', (msg) => {
    if (msg.chat.id.toString() === TELEGRAM_CHAT_ID && msg.text) {
      processSignalForAllUsers(msg.text);
    }
  });

  const processSignalForAllUsers = async (text: string) => {
    const msg = text.toLowerCase();
    let type = '';
    if (msg.includes('buy now')) type = 'BUY';
    if (msg.includes('sell now')) type = 'SELL';

    if (type) {
      const slMatch = msg.match(/sl\s+([\d.]+)/);
      const tpMatch = msg.match(/tp\s+([\d.]+)/);
      const sl = slMatch ? parseFloat(slMatch[1]) : null;
      const tp = tpMatch ? parseFloat(tpMatch[1]) : null;

      // Mock entry price
      const entryPrice = 1.0850 + (Math.random() * 0.0010);

      // Get all active users to create signals for them
      const users = db.prepare('SELECT id, username, lot_size FROM users').all();
      
      for (const user of users) {
        const info = db.prepare('INSERT INTO signals (user_id, type, sl, tp, entry_price, status) VALUES (?, ?, ?, ?, ?, ?)')
          .run(user.id, type, sl, tp, entryPrice, 'OPEN');
        
        const newSignal = {
          id: info.lastInsertRowid,
          user_id: user.id,
          type,
          pair: 'EURUSD',
          entry_price: entryPrice,
          sl,
          tp,
          status: 'OPEN',
          profit: 0,
          result: 'PENDING',
          timestamp: new Date().toISOString()
        };

        // Broadcast to all clients
        io.emit('new_signal', newSignal);
      }
      
      console.log(`Señal global procesada: ${type} @ ${entryPrice}`);
    }
  };

  // TradingView Webhook Endpoint
  // This is where TradingView sends updates about trades
  app.post('/api/tradingview/webhook', (req, res) => {
    const { signal_id, status, profit, result, user_id } = req.body;
    
    console.log('Webhook de TradingView recibido:', req.body);

    if (signal_id) {
      db.prepare('UPDATE signals SET status = ?, profit = ?, result = ? WHERE id = ?')
        .run(status || 'CLOSED', profit || 0, result || 'WIN', signal_id);
      
      // Update user capital if profit is provided
      if (profit && user_id) {
        db.prepare('UPDATE users SET capital = capital + ? WHERE id = ?').run(profit, user_id);
      }

      // Broadcast update
      io.emit('signal_update', { id: signal_id, status, profit, result });
    }
    
    res.json({ success: true });
  });

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const info = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashedPassword);
      res.json({ id: info.lastInsertRowid, username, capital: 1000, lot_size: 0.01, success_rate: 0 });
    } catch (e) {
      res.status(400).json({ error: 'Usuario ya existe' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (user && await bcrypt.compare(password, user.password)) {
      res.json(user);
    } else {
      res.status(401).json({ error: 'Credenciales inválidas' });
    }
  });

  // User Routes
  app.get('/api/user/:id', (req, res) => {
    const user = db.prepare('SELECT id, username, capital, lot_size, success_rate FROM users WHERE id = ?').get(req.params.id);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: 'Usuario no encontrado' });
    }
  });

  app.post('/api/user/:id/settings', (req, res) => {
    const { lot_size, capital } = req.body;
    // Fix: Ensure we parse numbers to avoid "multiple numbers" bug if strings are passed
    const parsedLot = parseFloat(lot_size);
    const parsedCapital = parseFloat(capital);
    
    db.prepare('UPDATE users SET lot_size = ?, capital = ? WHERE id = ?').run(parsedLot, parsedCapital, req.params.id);
    res.json({ success: true });
  });

  // Signals Routes
  app.get('/api/user/:id/signals', (req, res) => {
    const signals = db.prepare('SELECT * FROM signals WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50').all(req.params.id);
    res.json(signals);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
