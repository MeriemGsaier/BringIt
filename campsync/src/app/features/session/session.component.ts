import { Component, inject, signal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../core/services/session.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { NicknameService } from '../../core/services/nickname.service';

@Component({
  selector: 'app-session',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-forest-50 via-bark-50 to-earth-50">
      <div class="w-full max-w-md">
        <!-- Header -->
        <div class="text-center mb-8">
          <div class="text-6xl mb-4">⛺</div>
          <h1 class="text-4xl font-bold text-forest-800">BringIt</h1>
          <p class="text-bark-500 mt-2">Coordinate your trip with friends</p>
        </div>

        <!-- Cards -->
        <div class="space-y-4">
          <!-- Create session -->
          <div class="card">
            <h2 class="text-lg font-bold text-bark-800 mb-3">🌲 Start a new trip</h2>
            <form (ngSubmit)="createSession()" class="space-y-3">
              <input
                class="input-field"
                type="text"
                [(ngModel)]="tripName"
                name="tripName"
                placeholder="Trip name (e.g. Lake Weekend)"
                maxlength="40"
                required
              />
              @if (createError()) {
                <p class="text-red-500 text-sm text-center">{{ createError() }}</p>
              }
              <button type="submit" class="btn-primary w-full" [disabled]="creating() || !tripName.trim()">
                @if (creating()) { Creating... } @else { Create Trip }
              </button>
            </form>
          </div>

          <div class="flex items-center gap-3">
            <div class="flex-1 h-px bg-bark-200"></div>
            <span class="text-bark-400 text-sm">or join existing</span>
            <div class="flex-1 h-px bg-bark-200"></div>
          </div>

          <!-- Join session -->
          <div class="card">
            <h2 class="text-lg font-bold text-bark-800 mb-3">🔗 Join a trip</h2>
            <form (ngSubmit)="joinSession()" class="space-y-3">
              <input
                class="input-field tracking-widest text-center uppercase font-mono text-lg"
                type="text"
                [(ngModel)]="joinCode"
                name="joinCode"
                placeholder="ENTER CODE"
                maxlength="6"
                (input)="joinCode = joinCode.toUpperCase()"
              />
              @if (error()) {
                <p class="text-red-500 text-sm text-center">{{ error() }}</p>
              }
              <button type="submit" class="btn-primary w-full" [disabled]="joining() || joinCode.trim().length < 6">
                @if (joining()) { Joining... } @else { Join Trip }
              </button>
            </form>
          </div>
        </div>

        <p class="text-center text-bark-400 text-xs mt-6">
          No account needed — just a code to share with friends 🤝
        </p>
      </div>
    </div>
  `,
})
export class SessionComponent {
  private sessionService = inject(SessionService);
  private supabaseService = inject(SupabaseService);
  private nicknameService = inject(NicknameService);

  readonly joined = output<string>();

  tripName = '';
  joinCode = '';
  creating = signal(false);
  joining = signal(false);
  createError = signal('');
  error = signal('');

  private withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out. Check your Supabase config.')), ms)
      ),
    ]);
  }

  async createSession(): Promise<void> {
    if (!this.tripName.trim()) return;
    this.creating.set(true);
    this.createError.set('');
    try {
      const id = this.sessionService.generateCode();
      await this.withTimeout(this.supabaseService.createSession({
        id,
        name: this.tripName.trim(),
        createdAt: Date.now(),
        createdBy: this.nicknameService.nickname() ?? 'Unknown',
      }));
      this.sessionService.setSession(id);
      this.joined.emit(id);
    } catch (e: any) {
      console.error(e);
      this.createError.set(e?.message ?? 'Failed to create trip. Check console for details.');
    } finally {
      this.creating.set(false);
    }
  }

  async joinSession(): Promise<void> {
    const code = this.joinCode.trim().toUpperCase();
    if (code.length < 6) return;
    this.joining.set(true);
    this.error.set('');
    try {
      const session = await this.withTimeout(this.supabaseService.getSession(code));
      if (!session) {
        this.error.set('Trip not found. Check the code and try again.');
        return;
      }
      this.sessionService.setSession(code);
      this.joined.emit(code);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Could not connect. Please try again.');
    } finally {
      this.joining.set(false);
    }
  }
}
