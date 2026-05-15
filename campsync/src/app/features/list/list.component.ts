import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RealtimeChannel } from '@supabase/supabase-js';
import { CampItem, ItemCategory, CATEGORIES, CATEGORY_EMOJIS } from '../../core/models/item.model';
import { Session } from '../../core/models/session.model';
import { SupabaseService } from '../../core/services/supabase.service';
import { SessionService } from '../../core/services/session.service';
import { NicknameService, AVATARS } from '../../core/services/nickname.service';
import { ItemCardComponent } from './item-card.component';
import { AddItemComponent } from './add-item.component';

type FilterCategory = ItemCategory | 'All';
type FilterPerson = string | 'All';


@Component({
  selector: 'app-list',
  standalone: true,
  imports: [ItemCardComponent, AddItemComponent, FormsModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-forest-50 via-bark-50 to-earth-50">

      <!-- Header -->
      <header class="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-bark-100 shadow-sm">
        <div class="max-w-2xl mx-auto px-4 py-3 grid grid-cols-3 items-center gap-2">

          <button
            (click)="goToRooms()"
            class="flex items-center gap-1 text-forest-600 hover:text-forest-800 font-medium text-sm transition-colors w-fit"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            Rooms
          </button>

          <div class="text-center">
            <h1 class="font-bold text-bark-800 text-sm leading-tight truncate">
              ⛺ {{ session()?.name ?? 'Loading...' }}
            </h1>
            <p class="text-xs text-bark-400 mt-0.5">
              <span class="font-mono font-bold tracking-widest text-forest-600">{{ sessionId() }}</span>
              <button
                (click)="copyCode()"
                class="ml-1 transition-colors"
                [class]="copyState() === 'copied' ? 'text-forest-600' : copyState() === 'error' ? 'text-red-400' : 'text-bark-300 hover:text-forest-600'"
                [title]="copyState() === 'copied' ? 'Copied!' : copyState() === 'error' ? 'Could not copy' : 'Copy code'"
              >
                @if (copyState() === 'copied') {
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                } @else if (copyState() === 'error') {
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                  </svg>
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                  </svg>
                }
              </button>
            </p>
          </div>

          <div class="flex items-center gap-2 justify-end">
            <div class="w-8 h-8 rounded-full bg-forest-100 border border-forest-200 flex items-center justify-center text-lg leading-none flex-shrink-0">
              {{ avatar() }}
            </div>
            <span class="text-sm font-medium text-bark-700 truncate max-w-[80px]">{{ nickname() }}</span>
          </div>

        </div>
      </header>

      <main class="max-w-2xl mx-auto px-4 py-5 space-y-6 pb-24">

        <!-- Progress Banner -->
        <div class="card bg-gradient-to-r from-forest-600 to-forest-700 text-white border-0">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-forest-100 text-sm">Trip Progress</p>
              <p class="text-xl font-bold mt-0.5">
                {{ boughtCount() }} of {{ totalCount() }} items bought </p>
              @if (hasSpending()) {
                <p class="text-forest-200 text-sm mt-1">
                  💰 Total spent: {{ totalSpent().toFixed(2) }}
                </p>
              }
            </div>
            <div class="text-right">
              <div class="text-3xl font-bold">{{ progressPercent() }}%</div>
              <div class="w-24 h-2 bg-forest-500 rounded-full mt-1 overflow-hidden">
                <div
                  class="h-full bg-white rounded-full transition-all duration-500"
                  [style.width.%]="progressPercent()"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Category Filter -->
        <div class="flex gap-2 overflow-x-auto pb-1">
          <button
            (click)="setFilter('All')"
            class="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
            [class.bg-forest-600]="activeFilter() === 'All'"
            [class.text-white]="activeFilter() === 'All'"
            [class.bg-white]="activeFilter() !== 'All'"
            [class.text-bark-600]="activeFilter() !== 'All'"
            [class.border]="activeFilter() !== 'All'"
            [class.border-bark-200]="activeFilter() !== 'All'"
          >
            All ({{ totalCount() }})
          </button>
          @for (cat of categories; track cat) {
            <button
              (click)="setFilter(cat)"
              class="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              [class.bg-forest-600]="activeFilter() === cat"
              [class.text-white]="activeFilter() === cat"
              [class.bg-white]="activeFilter() !== cat"
              [class.text-bark-600]="activeFilter() !== cat"
              [class.border]="activeFilter() !== cat"
              [class.border-bark-200]="activeFilter() !== cat"
            >
              {{ categoryEmoji(cat) }} {{ cat }} ({{ countByCategory(cat) }})
            </button>
          }
        </div>

        <!-- People -->
        @if (assignedPersons().length > 0) {
          <div>
            <p class="text-xs font-semibold text-bark-400 uppercase tracking-wider mb-2.5">
              People · {{ assignedPersons().length }}
            </p>
            <div class="flex gap-4 overflow-x-auto pb-1 pt-[7px]">

              <!-- Everyone pill -->
              <button (click)="setPerson('All')" class="flex-shrink-0 flex flex-col items-center gap-1">
                <div
                  class="w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all"
                  [class.bg-bark-600]="activePerson() === 'All'"
                  [class.text-white]="activePerson() === 'All'"
                  [class.border-bark-600]="activePerson() === 'All'"
                  [class.bg-white]="activePerson() !== 'All'"
                  [class.text-bark-400]="activePerson() !== 'All'"
                  [class.border-bark-200]="activePerson() !== 'All'"
                >All</div>
                <span class="text-[11px] text-bark-500 font-medium">Everyone</span>
              </button>

              @for (person of assignedPersons(); track person) {
                <div class="flex-shrink-0 flex flex-col items-center gap-1 relative">

                  <!-- Avatar button -->
                  <button
                    (click)="setPerson(activePerson() === person ? 'All' : person)"
                    class="w-11 h-11 rounded-full transition-all ring-offset-1"
                    [class.ring-2]="activePerson() === person"
                    [class.ring-bark-600]="activePerson() === person"
                  >
                    @if (person === nickname()) {
                      <div class="w-full h-full rounded-full bg-forest-100 border-2 border-forest-200 flex items-center justify-center text-xl leading-none">
                        {{ avatar() }}
                      </div>
                    } @else {
                      <div
                        class="w-full h-full rounded-full flex items-center justify-center text-white text-sm font-bold"
                        [style.background-color]="avatarColor(person)"
                      >{{ person.charAt(0).toUpperCase() }}</div>
                    }
                  </button>

                  <!-- Remove badge (non-me only) -->
                  @if (person !== nickname()) {
                    <button
                      (click)="requestRemovePerson(person)"
                      class="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-bark-200 hover:bg-red-400 text-bark-500 hover:text-white text-[10px] font-bold flex items-center justify-center transition-colors leading-none"
                      title="Remove {{ person }}"
                    >×</button>
                  }

                  <span class="text-[11px] text-bark-700 font-medium truncate max-w-[56px] text-center leading-tight">
                    {{ person === nickname() ? 'Me' : person }}
                  </span>
                  <span class="text-[10px] text-bark-400">{{ countByPerson(person) }} item{{ countByPerson(person) === 1 ? '' : 's' }}</span>
                </div>
              }
            </div>
          </div>
        }

        <!-- Item List -->
        @if (loading()) {
          <div class="flex flex-col items-center justify-center py-10 text-bark-400 gap-3">
            <svg class="w-8 h-8 animate-spin text-forest-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            <p class="text-sm">Loading items...</p>
          </div>
        } @else if (filteredItems().length === 0) {
          <div class="text-center py-10 text-bark-400">
            <div class="text-4xl mb-2">🏕️</div>
            <p class="font-medium">No items yet!</p>
            <p class="text-sm mt-1">Tap + to add the first item.</p>
          </div>
        } @else {
          @let pending = pendingItems();
          @if (pending.length > 0) {
            <div>
              <h3 class="text-sm font-semibold text-bark-500 uppercase tracking-wider mb-2">
                Still needed ({{ pending.length }})
              </h3>
              <div class="space-y-6">
                @for (item of pending; track item.id) {
                  <app-item-card
                    [campItem]="item"
                    [participants]="participants()"
                    (markBought)="onMarkBought($event)"
                    (unmarkBought)="onUnmarkBought($event)"
                    (deleteItem)="onDelete($event)"
                    (editItem)="onEditItem($event)"
                  />
                }
              </div>
            </div>
          }

          @let bought = boughtItems();
          @if (bought.length > 0) {
            <div>
              <h3 class="text-sm font-semibold text-forest-600 uppercase tracking-wider mb-2">
                Got it ✅ ({{ bought.length }})
              </h3>
              <div class="space-y-4">
                @for (item of bought; track item.id) {
                  <app-item-card
                    [campItem]="item"
                    [participants]="participants()"
                    (markBought)="onMarkBought($event)"
                    (unmarkBought)="onUnmarkBought($event)"
                    (deleteItem)="onDelete($event)"
                    (editItem)="onEditItem($event)"
                  />
                }
              </div>
            </div>
          }
        }
      </main>

      <!-- FAB: Add Item -->
      <button
        (click)="showAddModal.set(true)"
        class="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-forest-600 hover:bg-forest-700 text-white shadow-lg flex items-center justify-center transition-colors"
        title="Add item"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      <!-- Add Item Modal -->
      <app-add-item
        [isOpen]="showAddModal()"
        [participants]="participants()"
        (itemAdded)="onItemAdded($event)"
        (closed)="showAddModal.set(false)"
      />

      <!-- Nickname Conflict Modal -->
      @if (showNicknameConflict()) {
        <div class="fixed inset-0 bg-bark-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div class="text-center mb-5">
              <div class="flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
              </div>
              <h3 class="text-lg font-bold text-bark-800">Nickname already taken</h3>
              <p class="text-bark-500 text-sm mt-2">
                Someone in this room is already using
                <span class="font-semibold text-bark-700">"{{ nickname() }}"</span>.
                Change your nickname to avoid confusion.
              </p>
            </div>
            <div class="space-y-2">
              <button
                (click)="showNicknameConflict.set(false); showChangeNickname.set(true)"
                class="btn-primary w-full flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                </svg>
                Change my nickname
              </button>
              <button
                (click)="dismissConflict()"
                class="btn-ghost w-full text-sm"
              >
                Continue anyway
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Change Nickname Modal -->
      @if (showChangeNickname()) {
        <div class="fixed inset-0 bg-bark-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div class="flex items-center justify-between mb-5">
              <h3 class="text-lg font-bold text-bark-800">Change nickname</h3>
              <button (click)="showChangeNickname.set(false)" class="text-bark-400 hover:text-bark-600 text-2xl leading-none">&times;</button>
            </div>

            <!-- Avatar picker -->
            <div class="mb-4">
              <p class="text-xs font-semibold text-bark-500 uppercase tracking-wider mb-2 text-center">Choose your avatar</p>
              <div class="grid grid-cols-4 gap-2">
                @for (av of avatars; track av) {
                  <button
                    type="button"
                    class="text-2xl w-12 h-12 rounded-xl flex items-center justify-center transition-all border-2 mx-auto"
                    [class.border-forest-500]="changeNicknameAvatar === av"
                    [class.bg-forest-50]="changeNicknameAvatar === av"
                    [class.border-transparent]="changeNicknameAvatar !== av"
                    [class.bg-bark-50]="changeNicknameAvatar !== av"
                    (click)="changeNicknameAvatar = av"
                  >{{ av }}</button>
                }
              </div>
            </div>

            <input
              class="input-field mb-4 text-center text-lg"
              type="text"
              [(ngModel)]="changeNicknameName"
              placeholder="New nickname"
              maxlength="20"
              autofocus
            />
            <button
              (click)="confirmNicknameChange()"
              class="btn-primary w-full"
              [disabled]="!changeNicknameName.trim()"
            >
              Save
            </button>
          </div>
        </div>
      }

      <!-- Remove Person Confirm Modal -->
      @if (personToRemove()) {
        <div
          class="fixed inset-0 bg-bark-900/40 flex items-center justify-center z-50 p-4"
          (click)="personToRemove.set(null)"
        >
          <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs" (click)="$event.stopPropagation()">
            <div class="text-center mb-4">
              <div class="flex items-center justify-center w-12 h-12 rounded-full bg-bark-100 mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-bark-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
                </svg>
              </div>
              <h3 class="text-lg font-bold text-bark-800">Remove participant?</h3>
              <p class="text-bark-500 text-sm mt-1">
                All items added by or assigned to
                <span class="font-semibold text-bark-700">{{ personToRemove() }}</span>
                will be deleted from this session.
              </p>
            </div>
            <div class="flex gap-3">
              <button (click)="personToRemove.set(null)" class="btn-ghost flex-1 text-sm py-2">Cancel</button>
              <button
                (click)="confirmRemovePerson()"
                class="flex-1 text-sm py-2 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
              >Remove</button>
            </div>
          </div>
        </div>
      }

      <!-- Error toast -->
      @if (mutationError()) {
        <div class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg whitespace-nowrap flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          {{ mutationError() }}
        </div>
      }

    </div>
  `,
})
export class ListComponent implements OnInit, OnDestroy {
  private supabaseService = inject(SupabaseService);
  private sessionService  = inject(SessionService);
  private nicknameService = inject(NicknameService);

  readonly sessionId = this.sessionService.sessionId;
  readonly nickname  = this.nicknameService.nickname;
  readonly avatar    = this.nicknameService.avatar;
  readonly avatars   = AVATARS;

  session       = signal<Session | undefined>(undefined);
  items         = signal<CampItem[]>([]);
  loading       = signal(true);
  activeFilter  = signal<FilterCategory>('All');
  activePerson  = signal<FilterPerson>('All');
  showAddModal  = signal(false);
  mutationError = signal('');

  showNicknameConflict = signal(false);
  showChangeNickname   = signal(false);
  changeNicknameName   = '';
  changeNicknameAvatar = AVATARS[0];

  personToRemove = signal<string | null>(null);

  copyState = signal<'idle' | 'copied' | 'error'>('idle');

  readonly categories = CATEGORIES;
  private itemsChannel?: RealtimeChannel;

  participants = computed(() => {
    const me = this.nicknameService.nickname() ?? 'Anonymous';
    const names = this.items().flatMap(i => [i.addedBy, i.assignedTo]).filter(Boolean);
    return [...new Set([me, ...names])];
  });

  assignedPersons = computed(() => {
    const names = this.items().map(i => i.assignedTo).filter(Boolean);
    return [...new Set(names)].sort();
  });

  filteredItems = computed(() => {
    let list = this.items();
    const cat = this.activeFilter();
    const person = this.activePerson();
    if (cat !== 'All') list = list.filter(i => i.category === cat);
    if (person !== 'All') list = list.filter(i => i.assignedTo === person);
    return list;
  });
  pendingItems    = computed(() => this.filteredItems().filter(i => !i.bought));
  boughtItems     = computed(() => this.filteredItems().filter(i => i.bought));
  totalCount      = computed(() => this.items().length);
  boughtCount     = computed(() => this.items().filter(i => i.bought).length);
  progressPercent = computed(() => {
    const total = this.totalCount();
    return total === 0 ? 0 : Math.round((this.boughtCount() / total) * 100);
  });
  totalSpent = computed(() =>
    this.boughtItems()
      .filter(i => i.price != null)
      .reduce((sum, i) => sum + (i.price ?? 0), 0)
  );
  hasSpending = computed(() => this.items().some(i => i.bought && i.price != null));

  ngOnInit(): void {
    const id = this.sessionId();
    if (!id) return;
    this.supabaseService.getSession(id).then(s => this.session.set(s ?? undefined));
    this.loadItems(id);
    this.itemsChannel = this.supabaseService.subscribeToItems(id, () => this.loadItems(id));
  }

  ngOnDestroy(): void {
    if (this.itemsChannel) this.supabaseService.unsubscribe(this.itemsChannel);
  }

  private async loadItems(sessionId: string): Promise<void> {
    try {
      const items = await this.supabaseService.fetchItems(sessionId);
      this.items.set(items);
    } catch {
      // fall through — show empty list rather than infinite spinner
    } finally {
      this.loading.set(false);
      this.checkNicknameConflict(sessionId);
    }
  }

  private showError(msg: string): void {
    this.mutationError.set(msg);
    setTimeout(() => this.mutationError.set(''), 3000);
  }

  // ── Nickname conflict ──────────────────────────────────────────────────────

  private checkNicknameConflict(sessionId: string): void {
    if (!this.sessionService.wasJustJoined) return;
    if (this.sessionService.isSessionOwned(sessionId)) return;
    const me = this.nicknameService.nickname() ?? '';
    if (me && this.items().some(i => i.addedBy === me)) {
      this.showNicknameConflict.set(true);
    }
  }

  dismissConflict(): void {
    const id = this.sessionId();
    if (id) this.sessionService.markSessionAsOwned(id);
    this.showNicknameConflict.set(false);
  }

  confirmNicknameChange(): void {
    const name = this.changeNicknameName.trim();
    if (!name) return;
    this.nicknameService.setNickname(name);
    this.nicknameService.setAvatar(this.changeNicknameAvatar);
    this.showChangeNickname.set(false);
    this.changeNicknameName = '';
    const id = this.sessionId();
    if (id) this.sessionService.markSessionAsOwned(id);
  }

  // ── Remove participant ─────────────────────────────────────────────────────

  requestRemovePerson(person: string): void {
    this.personToRemove.set(person);
  }

  async confirmRemovePerson(): Promise<void> {
    const person = this.personToRemove();
    const sessionId = this.sessionId();
    if (!person || !sessionId) return;

    const removed = this.items().filter(i => i.addedBy === person || i.assignedTo === person);
    this.items.update(list =>
      list.filter(i => i.addedBy !== person && i.assignedTo !== person)
    );
    if (this.activePerson() === person) this.activePerson.set('All');
    this.personToRemove.set(null);

    try {
      await this.supabaseService.deleteItemsByPerson(sessionId, person);
    } catch {
      this.items.update(list => [...list, ...removed]);
      this.showError('Failed to remove participant.');
    }
  }

  // ── Filters ────────────────────────────────────────────────────────────────

  setFilter(cat: FilterCategory): void { this.activeFilter.set(cat); }
  setPerson(person: FilterPerson): void { this.activePerson.set(person); }

  categoryEmoji(cat: ItemCategory): string { return CATEGORY_EMOJIS[cat] ?? '📦'; }

  countByCategory(cat: ItemCategory): number {
    const person = this.activePerson();
    let list = this.items();
    if (person !== 'All') list = list.filter(i => i.assignedTo === person);
    return list.filter(i => i.category === cat).length;
  }

  countByPerson(person: string): number {
    const cat = this.activeFilter();
    let list = this.items();
    if (cat !== 'All') list = list.filter(i => i.category === cat);
    return list.filter(i => i.assignedTo === person).length;
  }

  // ── Item actions ───────────────────────────────────────────────────────────

  async onItemAdded(partial: Omit<CampItem, 'id'>): Promise<void> {
    const sessionId = this.sessionId();
    if (!sessionId) return;
    const item: CampItem = { ...partial, id: crypto.randomUUID() };
    this.sessionService.markSessionAsOwned(sessionId);
    this.items.update(list => [...list, item]);
    try {
      await this.supabaseService.addItem(sessionId, item);
    } catch {
      this.items.update(list => list.filter(i => i.id !== item.id));
      this.showError('Failed to add item.');
    }
  }

  async onMarkBought(event: { id: string; price?: number }): Promise<void> {
    const boughtBy = this.nicknameService.nickname() ?? 'Someone';
    const boughtAt = Date.now();
    this.items.update(list =>
      list.map(i => i.id === event.id ? { ...i, bought: true, boughtBy, boughtAt, price: event.price } : i)
    );
    try {
      await this.supabaseService.updateItem(event.id, { bought: true, boughtBy, boughtAt, price: event.price });
    } catch {
      this.items.update(list =>
        list.map(i => i.id === event.id
          ? { ...i, bought: false, boughtBy: undefined, boughtAt: undefined, price: undefined }
          : i
        )
      );
      this.showError('Failed to mark item as bought.');
    }
  }

  async onUnmarkBought(itemId: string): Promise<void> {
    const prev = this.items().find(i => i.id === itemId);
    this.items.update(list =>
      list.map(i => i.id === itemId
        ? { ...i, bought: false, boughtBy: undefined, boughtAt: undefined, price: undefined }
        : i
      )
    );
    try {
      await this.supabaseService.updateItem(itemId, {
        bought: false, boughtBy: undefined, boughtAt: undefined, price: undefined,
      });
    } catch {
      if (prev) this.items.update(list => list.map(i => i.id === itemId ? prev : i));
      this.showError('Failed to unmark item.');
    }
  }

  async onEditItem(event: { id: string; changes: Partial<CampItem> }): Promise<void> {
    const prev = this.items().find(i => i.id === event.id);
    this.items.update(list =>
      list.map(i => i.id === event.id ? { ...i, ...event.changes } : i)
    );
    try {
      await this.supabaseService.updateItem(event.id, event.changes);
    } catch {
      if (prev) this.items.update(list => list.map(i => i.id === event.id ? prev : i));
      this.showError('Failed to save changes.');
    }
  }

  async onDelete(itemId: string): Promise<void> {
    const prev = this.items().find(i => i.id === itemId);
    this.items.update(list => list.filter(i => i.id !== itemId));
    try {
      await this.supabaseService.deleteItem(itemId);
    } catch {
      if (prev) this.items.update(list => [...list, prev]);
      this.showError('Failed to delete item.');
    }
  }

  copyCode(): void {
    const id = this.sessionId();
    if (!id) return;
    navigator.clipboard.writeText(id).then(() => {
      this.copyState.set('copied');
      setTimeout(() => this.copyState.set('idle'), 2000);
    }).catch(() => {
      this.copyState.set('error');
      setTimeout(() => this.copyState.set('idle'), 2000);
    });
  }

  avatarColor(name: string): string {
    const palette = ['#4a7c59', '#c2922f', '#8b4513', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#0f766e'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = Math.imul(31, h) + name.charCodeAt(i) | 0;
    return palette[Math.abs(h) % palette.length];
  }

  goToRooms(): void { this.sessionService.clearSession(); }
}
