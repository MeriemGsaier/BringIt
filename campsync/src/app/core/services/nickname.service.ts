import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'bringit_nickname';

@Injectable({ providedIn: 'root' })
export class NicknameService {
  readonly nickname = signal<string | null>(this.loadNickname());

  private loadNickname(): string | null {
    return localStorage.getItem(STORAGE_KEY);
  }

  setNickname(name: string): void {
    const trimmed = name.trim();
    localStorage.setItem(STORAGE_KEY, trimmed);
    this.nickname.set(trimmed);
  }

  hasNickname(): boolean {
    return !!this.nickname();
  }
}
