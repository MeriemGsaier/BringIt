import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { CampItem, ItemCategory, CATEGORIES, CATEGORY_EMOJIS } from '../../core/models/item.model';
import { Session } from '../../core/models/session.model';
import { SupabaseService } from '../../core/services/supabase.service';
import { SessionService } from '../../core/services/session.service';
import { NicknameService } from '../../core/services/nickname.service';
import { ItemCardComponent } from './item-card.component';
import { AddItemComponent } from './add-item.component';

type FilterCategory = ItemCategory | 'All';
type FilterPerson = string | 'All';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [ItemCardComponent, AddItemComponent],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-forest-50 via-bark-50 to-earth-50">

      <!-- Header -->
      <header class="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-bark-100 shadow-sm">
        <div class="max-w-2xl mx-auto px-4 py-3 grid grid-cols-3 items-center gap-2">

          <!-- Left: back navigation -->
          <button
            (click)="goToRooms()"
            class="flex items-center gap-1 text-forest-600 hover:text-forest-800 font-medium text-sm transition-colors w-fit"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            Rooms
          </button>

          <!-- Center: trip title + code -->
          <div class="text-center">
            <h1 class="font-bold text-bark-800 text-sm leading-tight truncate">
              ⛺ {{ session()?.name ?? 'Loading...' }}
            </h1>
            <p class="text-xs text-bark-400 mt-0.5">
              <span class="font-mono font-bold tracking-widest text-forest-600">{{ sessionId() }}</span>
              <button (click)="copyCode()" class="ml-1 text-bark-300 hover:text-forest-600 transition-colors" title="Copy code">📋</button>
            </p>
          </div>

          <!-- Right: user identity -->
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
              <button
                (click)="setPerson(person)"
                class="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                [class.bg-bark-600]="activePerson() === person"
                [class.text-white]="activePerson() === person"
                [class.bg-white]="activePerson() !== person"
                [class.text-bark-600]="activePerson() !== person"
                [class.border]="activePerson() !== person"
                [class.border-bark-200]="activePerson() !== person"
              >
                👤 {{ person === nickname() ? 'Me' : person }} ({{ countByPerson(person) }})
              </button>
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

  session       = signal<Session | undefined>(undefined);
  items         = signal<CampItem[]>([]);
  loading       = signal(true);
  activeFilter  = signal<FilterCategory>('All');
  activePerson  = signal<FilterPerson>('All');
  showAddModal  = signal(false);

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
  }

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

  async onItemAdded(item: Omit<CampItem, 'id'>): Promise<void> {
    const id = this.sessionId();
    if (id) await this.supabaseService.addItem(id, item);
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
