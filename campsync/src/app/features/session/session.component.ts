import { Component, inject, signal, output, computed } from '@angular/core';
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
      <div class="w-full max-w-md space-y-5">

        <!-- Header -->
        <div class="text-center">
          <div class="text-6xl mb-3">⛺</div>
          <h1 class="text-4xl font-bold text-forest-800">BringIt</h1>
          <p class="text-bark-500 mt-1">Coordinate your trip with friends</p>
        </div>

        <!-- Saved Rooms -->
        @if (savedRooms().length > 0) {
          <div class="card">
            <h2 class="text-sm font-semibold text-bark-500 uppercase tracking-wider mb-3">Your Rooms</h2>
            <div class="space-y-2">
              @for (room of savedRooms(); track room.id) {
                <div class="flex items-center justify-between bg-bark-50 rounded-lg px-3 py-2">
                  <div>
                    <p class="font-semibold text-bark-800">{{ room.name }}</p>
                    <p class="text-xs font-mono text-forest-600 tracking-widest">{{ room.id }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      (click)="switchToRoom(room.id)"
                      class="btn-primary text-xs px-3 py-1.5"
                    >Enter</button>
                    <button
                      (click)="removeRoom(room.id)"
                      class="text-bark-300 hover:text-red-400 transition-colors text-lg leading-none px-1"
                      title="Leave room"
                    >&times;</button>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div class="flex-1 h-px bg-bark-200"></div>
            <span class="text-bark-400 text-sm">or</span>
            <div class="flex-1 h-px bg-bark-200"></div>
          </div>
        }

        <!-- Create -->
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

        <!-- Join -->
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
            @if (joinError()) {
              <p class="text-red-500 text-sm text-center">{{ joinError() }}</p>
            }
            <button type="submit" class="btn-primary w-full" [disabled]="joining() || joinCode.trim().length < 6">
              @if (joining()) { Joining... } @else { Join Trip }
            </button>
          </form>
        </div>

        <p class="text-center text-bark-400 text-xs">No account needed — just a code to share 🤝</p>
      </div>
    </div>
  `,
})
export class SessionComponent {
  private sessionService  = inject(SessionService);
  private supabaseService = inject(SupabaseService);
  private nicknameService = inject(NicknameService);

  readonly joined = output<string>();

  readonly savedRooms = this.sessionService.sessions;

  tripName  = '';
  joinCode  = '';
  creating  = signal(false);
  joining   = signal(false);
  createError = signal('');
  joinError   = signal('');

  private withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out. Check your connection.')), ms)
      ),
    ]);
  }

  switchToRoom(id: string): void {
    this.sessionService.switchSession(id);
    this.joined.emit(id);
  }

  removeRoom(id: string): void {
    this.sessionService.removeSession(id);
  }

  async createSession(): Promise<void> {
    if (!this.tripName.trim()) return;
    this.creating.set(true);
    this.createError.set('');
    try {
      const id = this.sessionService.generateCode();
      const name = this.tripName.trim();
      await this.withTimeout(this.supabaseService.createSession({
        id,
        name,
        createdAt: Date.now(),
        createdBy: this.nicknameService.nickname() ?? 'Unknown',
      }));
      this.sessionService.setSession(id, name);
      this.joined.emit(id);
    } catch (e: any) {
      this.createError.set(e?.message ?? 'Failed to create trip.');
    } finally {
      this.creating.set(false);
    }
  }

  async joinSession(): Promise<void> {
    const code = this.joinCode.trim().toUpperCase();
    if (code.length < 6) return;
    this.joining.set(true);
    this.joinError.set('');
    try {
      const session = await this.withTimeout(this.supabaseService.getSession(code));
      if (!session) {
        this.joinError.set('Trip not found. Check the code and try again.');
        return;
      }
      this.sessionService.setSession(code, session.name);
      this.joined.emit(code);
    } catch (e: any) {
      this.joinError.set(e?.message ?? 'Could not connect. Please try again.');
    } finally {
      this.joining.set(false);
    }
  }
}
