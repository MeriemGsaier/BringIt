import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'bringit_session_id';

@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly sessionId = signal<string | null>(this.loadSession());

  private loadSession(): string | null {
    return localStorage.getItem(STORAGE_KEY);
  }

  generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  setSession(id: string): void {
    localStorage.setItem(STORAGE_KEY, id);
    this.sessionId.set(id);
  }

  clearSession(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.sessionId.set(null);
  }

  hasSession(): boolean {
    return !!this.sessionId();
  }
}
