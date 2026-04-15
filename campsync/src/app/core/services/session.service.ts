import { Injectable, signal } from '@angular/core';

const SESSIONS_KEY = 'bringit_sessions';
const ACTIVE_KEY   = 'bringit_active_session';

export interface StoredSession { id: string; name: string; }

@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly sessions  = signal<StoredSession[]>(this.loadSessions());
  readonly sessionId = signal<string | null>(this.loadActive());

  private loadSessions(): StoredSession[] {
    try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]'); }
    catch { return []; }
  }

  private loadActive(): string | null {
    return localStorage.getItem(ACTIVE_KEY);
  }

  generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  setSession(id: string, name: string): void {
    const current = this.sessions();
    if (!current.find(s => s.id === id)) {
      const updated = [...current, { id, name }];
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
      this.sessions.set(updated);
    }
    localStorage.setItem(ACTIVE_KEY, id);
    this.sessionId.set(id);
  }

  switchSession(id: string): void {
    localStorage.setItem(ACTIVE_KEY, id);
    this.sessionId.set(id);
  }

  /** Go back to room list without removing the room */
  clearSession(): void {
    localStorage.removeItem(ACTIVE_KEY);
    this.sessionId.set(null);
  }

  /** Remove a room from the saved list */
  removeSession(id: string): void {
    const updated = this.sessions().filter(s => s.id !== id);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
    this.sessions.set(updated);
    if (this.sessionId() === id) this.clearSession();
  }

  hasSession(): boolean {
    return !!this.sessionId();
  }
}
