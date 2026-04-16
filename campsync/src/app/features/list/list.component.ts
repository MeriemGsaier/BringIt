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

const MY_SESSIONS_KEY = 'bringit_my_sessions';

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
              <button (click)="copyCode()" class="ml-1 text-bark-300 hover:text-forest-600 transition-colors" title="Copy code">📋</button>
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
                {{ boughtCount() }} of {{ totalCount() }} items bought ✅
              </p>
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

        <!-- Person Filter -->
        @if (assignedPersons().length > 1) {
          <div class="flex gap-2 overflow-x-auto pb-1">
            <button
              (click)="setPerson('All')"
              class="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              [class.bg-bark-600]="activePerson() === 'All'"
              [class.text-white]="activePerson() === 'All'"
              [class.bg-white]="activePerson() !== 'All'"
              [class.text-bark-600]="activePerson() !== 'All'"
              [class.border]="activePerson() !== 'All'"
              [class.border-bark-200]="activePerson() !== 'All'"
            >
              Everyone
            </button>
            @for (person of assignedPersons(); track person) {
              <div class="flex items-center flex-shrink-0">
                <button
                  (click)="setPerson(person)"
                  class="px-3 py-1.5 text-sm font-medium transition-colors"
                  [class.rounded-full]="person === nickname()"
                  [class.rounded-l-full]="person !== nickname()"
                  [class.rounded-r-none]="person !== nickname()"
                  [class.bg-bark-600]="activePerson() === person"
                  [class.text-white]="activePerson() === person"
                  [class.bg-white]="activePerson() !== person"
                  [class.text-bark-600]="activePerson() !== person"
                  [class.border]="activePerson() !== person"
                  [class.border-r-0]="activePerson() !== person && person !== nickname()"
                  [class.border-bark-200]="activePerson() !== person"
                >
                  👤 {{ person === nickname() ? 'Me' : person }} ({{ countByPerson(person) }})
                </button>
                @if (person !== nickname()) {
                  <button
                    (click)="requestRemovePerson(person)"
                    class="px-2 py-1.5 text-sm rounded-r-full border border-l-0 transition-colors"
                    [class.bg-bark-600]="activePerson() === person"
                    [class.text-white]="activePerson() === person"
                    [class.border-bark-600]="activePerson() === person"
                    [class.bg-white]="activePerson() !== person"
                    [class.text-bark-400]="activePerson() !== person"
                    [class.hover:text-red-400]="activePerson() !== person"
                    [class.border-bark-200]="activePerson() !== person"
                    title="Remove {{ person }} from session"
                  >&times;</button>
                }
              </div>
            }
          </div>
        }

        <!-- Item List -->
        @if (loading()) {
          <div class="text-center py-10 text-bark-400">
            <div class="text-4xl mb-2">🔄</div>
            <p>Loading items...</p>
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
              <div class="text-4xl mb-3">⚠️</div>
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
                class="btn-primary w-full"
              >
                ✏️ Change my nickname
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
              <div class="text-4xl mb-3">👤</div>
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

  // Nickname conflict
  showNicknameConflict = signal(false);
  showChangeNickname   = signal(false);
  changeNicknameName   = '';
  changeNicknameAvatar = AVATARS[0];

  // Remove participant
  personToRemove = signal<string | null>(null);

  readonly categories = CATEGORIES;
  private itemsChannel?: RealtimeChannel;

  participants = computed(() => {
    const me = this.nicknameService.nickname() ?? 'Anonymous';
    const names = this.items().map(i => i.addedBy).filter(Boolean);
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
    const items = await this.supabaseService.fetchItems(sessionId);
    this.items.set(items);
    this.loading.set(false);
    this.checkNicknameConflict(sessionId);
  }

  // ── Nickname conflict ──────────────────────────────────────────────────────

  private getMySessionIds(): string[] {
    try { return JSON.parse(localStorage.getItem(MY_SESSIONS_KEY) ?? '[]'); }
    catch { return []; }
  }

  private markSessionAsMine(sessionId: string): void {
    const ids = this.getMySessionIds();
    if (!ids.includes(sessionId)) {
      localStorage.setItem(MY_SESSIONS_KEY, JSON.stringify([...ids, sessionId]));
    }
  }

  private checkNicknameConflict(sessionId: string): void {
    // Only warn on first visit (before the user has added any items)
    if (this.getMySessionIds().includes(sessionId)) return;
    const me = this.nicknameService.nickname() ?? '';
    if (me && this.items().some(i => i.addedBy === me)) {
      this.showNicknameConflict.set(true);
    }
  }

  dismissConflict(): void {
    const id = this.sessionId();
    if (id) this.markSessionAsMine(id); // don't warn again on this device
    this.showNicknameConflict.set(false);
  }

  confirmNicknameChange(): void {
    const name = this.changeNicknameName.trim();
    if (!name) return;
    this.nicknameService.setNickname(name);
    this.nicknameService.setAvatar(this.changeNicknameAvatar);
    this.showChangeNickname.set(false);
    this.changeNicknameName = '';
    // After changing, mark this session as mine to avoid re-triggering
    const id = this.sessionId();
    if (id) this.markSessionAsMine(id);
  }

  // ── Remove participant ─────────────────────────────────────────────────────

  requestRemovePerson(person: string): void {
    this.personToRemove.set(person);
  }

  async confirmRemovePerson(): Promise<void> {
    const person = this.personToRemove();
    const sessionId = this.sessionId();
    if (!person || !sessionId) return;

    // Optimistic update
    this.items.update(list =>
      list.filter(i => i.addedBy !== person && i.assignedTo !== person)
    );
    if (this.activePerson() === person) this.activePerson.set('All');
    this.personToRemove.set(null);

    await this.supabaseService.deleteItemsByPerson(sessionId, person);
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

  async onItemAdded(item: Omit<CampItem, 'id'>): Promise<void> {
    const id = this.sessionId();
    if (!id) return;
    this.markSessionAsMine(id);
    await this.supabaseService.addItem(id, item);
  }

  async onMarkBought(event: { id: string; price?: number }): Promise<void> {
    await this.supabaseService.updateItem(event.id, {
      bought: true,
      boughtBy: this.nicknameService.nickname() ?? 'Someone',
      boughtAt: Date.now(),
      price: event.price,
    });
  }

  async onUnmarkBought(itemId: string): Promise<void> {
    await this.supabaseService.updateItem(itemId, {
      bought: false, boughtBy: undefined, boughtAt: undefined, price: undefined,
    });
  }

  async onEditItem(event: { id: string; changes: Partial<CampItem> }): Promise<void> {
    await this.supabaseService.updateItem(event.id, event.changes);
  }

  async onDelete(itemId: string): Promise<void> {
    this.items.update(list => list.filter(i => i.id !== itemId));
    await this.supabaseService.deleteItem(itemId);
  }

  copyCode(): void {
    const id = this.sessionId();
    if (id) navigator.clipboard.writeText(id).catch(() => {});
  }

  goToRooms(): void { this.sessionService.clearSession(); }
}
