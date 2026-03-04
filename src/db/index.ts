import { DexieAdapter } from './DexieAdapter';
import type { IStorageAdapter } from './IStorageAdapter';

// デフォルトは Dexie（ローカル）。ログイン後に SupabaseAdapter へ切り替わる。
let _adapter: IStorageAdapter = new DexieAdapter();

export function getStorageAdapter(): IStorageAdapter {
  return _adapter;
}

export function setStorageAdapter(adapter: IStorageAdapter): void {
  _adapter = adapter;
}
