export interface User {
  id: number;
  username: string;
}

export interface AccountConfig {
  mt5_account?: string;
  mt5_password?: string;
  mt5_server?: string;
  telegram_token?: string;
  telegram_chat_id?: string;
  metaapi_token?: string;
  lot_size?: number;
  is_active?: number;
}

export interface Signal {
  id: number;
  message: string;
  type: string;
  symbol: string;
  entry_price: number;
  sl: number;
  tp: number;
  status: string;
  timestamp: string;
}
