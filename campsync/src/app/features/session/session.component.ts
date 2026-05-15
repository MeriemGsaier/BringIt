import { Component, inject, signal, output, OnInit } from '@angular/core';
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
                <div class="bg-bark-50 rounded-xl p-3 space-y-2.5">

                  <!-- Room name + actions -->
                  <div class="flex items-center justify-between gap-2">
                    <div class="min-w-0">
                      <p class="font-semibold text-bark-800 truncate">{{ room.name }}</p>
                      <p class="text-xs font-mono text-forest-600 tracking-widest">{{ room.id }}</p>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                      <button
                        (click)="switchToRoom(room.id)"
                        class="btn-primary text-xs px-3 py-1.5"
                      >Enter</button>
                      <button
                        (click)="removeRoom(room.id)"
                        class="text-bark-300 hover:text-red-400 transition-colors text-xl leading-none"
                        title="Leave room"
                      >&times;</button>
                    </div>
                  </div>

                  <!-- Participants row -->
                  @let people = roomParticipants()[room.id];
                  @if (people && people.length > 0) {
                    <div class="flex items-center gap-2">
                      <div class="flex -space-x-1.5">
                        @for (p of people.slice(0, 6); track p) {
                          <div
                            class="w-6 h-6 rounded-full border-2 border-bark-50 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                            [style.background-color]="avatarColor(p)"
                            [title]="p"
                          >{{ p.charAt(0).toUpperCase() }}</div>
                        }
                      </div>
                      @if (people.length > 6) {
                        <span class="text-xs text-bark-400 font-medium">+{{ people.length - 6 }}</span>
                      }
                      <span class="text-xs text-bark-400">
                        {{ people.length }} {{ people.length === 1 ? 'person' : 'people' }}
                      </span>
                    </div>
                  } @else if (people !== undefined) {
                    <p class="text-xs text-bark-300 italic">No activity yet — be the first!</p>
                  } @else {
                    <div class="flex gap-1.5">
                      <div class="w-6 h-6 rounded-full bg-bark-200 animate-pulse"></div>
                      <div class="w-6 h-6 rounded-full bg-bark-200 animate-pulse"></div>
                      <div class="w-6 h-6 rounded-full bg-bark-200 animate-pulse"></div>
                    </div>
                  }

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
export class SessionComponent implements OnInit {
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

  roomParticipants = signal<Record<string, string[]>>({});

  ngOnInit(): void {
    this.loadRoomParticipants();
  }

  private async loadRoomParticipants(): Promise<void> {
    const rooms = this.savedRooms();
    if (rooms.length === 0) return;
    const results: Record<string, string[]> = {};
    await Promise.allSettled(
      rooms.map(async room => {
        results[room.id] = await this.supabaseService.getSessionParticipants(room.id);
      })
    );
    this.roomParticipants.set(results);
  }

  avatarColor(name: string): string {
    const palette = ['#4a7c59', '#c2922f', '#8b4513', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#0f766e'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = Math.imul(31, h) + name.charCodeAt(i) | 0;
    return palette[Math.abs(h) % palette.length];
  }

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
        createdAt: new Date().toISOString(),
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
