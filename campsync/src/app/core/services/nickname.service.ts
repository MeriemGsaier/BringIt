import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'bringit_nickname';
const AVATAR_KEY = 'bringit_avatar';

export const AVATARS = ['🦊','🐻','🦁','🐺','🦝','🦌','🐸','🦅','🦉','🐧','🐢','🦋','🌵','⛰️','🌊','🌙'];

@Injectable({ providedIn: 'root' })
export class NicknameService {
  readonly nickname = signal<string | null>(this.loadNickname());
  readonly avatar = signal<string>(this.loadAvatar());

  private loadNickname(): string | null {
    return localStorage.getItem(STORAGE_KEY);
  }

  private loadAvatar(): string {
    return localStorage.getItem(AVATAR_KEY) ?? AVATARS[0];
  }

  setNickname(name: string): void {
    const trimmed = name.trim();
    localStorage.setItem(STORAGE_KEY, trimmed);
    this.nickname.set(trimmed);
  }

  setAvatar(avatar: string): void {
    localStorage.setItem(AVATAR_KEY, avatar);
    this.avatar.set(avatar);
  }

  hasNickname(): boolean {
    return !!this.nickname();
  }
}
