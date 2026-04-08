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

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [ItemCardComponent, AddItemComponent],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-forest-50 via-bark-50 to-earth-50">

      <!-- Header -->
      <header class="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-bark-100 shadow-sm">
        <div class="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-2xl">⛺</span>
            <div>
              <h1 class="font-bold text-bark-800 leading-tight">
                {{ session()?.name ?? 'Loading...' }}
              </h1>
              <p class="text-xs text-bark-400">
                Code: <span class="font-mono font-bold tracking-widest text-forest-600">{{ sessionId() }}</span>
                <button (click)="copyCode()" class="ml-1.5 text-bark-400 hover:text-forest-600" title="Copy code">📋</button>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm text-bark-500">{{ avatar() }} {{ nickname() }}</span>
            <button (click)="leaveSession()" class="btn-ghost text-xs px-2 py-1">Leave</button>
          </div>
        </div>
      </header>

      <main class="max-w-2xl mx-auto px-4 py-5 space-y-4">

        <!-- Progress Banner -->
        <div class="card bg-gradient-to-r from-forest-600 to-forest-700 text-white border-0">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-forest-100 text-sm">Trip Progress</p>
              <p class="text-xl font-bold mt-0.5">
                {{ boughtCount() }} of {{ totalCount() }} items bought ✅
              </p>
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

        <!-- Add Item Form -->
        <app-add-item class="mt-2 block" [participants]="participants()" (itemAdded)="onItemAdded($event)" />

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
            <p class="text-sm mt-1">Add the first item to get started.</p>
          </div>
        } @else {
          @let pending = pendingItems();
          @if (pending.length > 0) {
            <div>
              <h3 class="text-sm font-semibold text-bark-500 uppercase tracking-wider mb-2">
                Still needed ({{ pending.length }})
              </h3>
              <div class="space-y-2">
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
              <div class="space-y-2">
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
    </div>
  `,
})
export class ListComponent implements OnInit, OnDestroy {
  private supabaseService = inject(SupabaseService);
  private sessionService = inject(SessionService);
  private nicknameService = inject(NicknameService);

  readonly sessionId = this.sessionService.sessionId;
  readonly nickname = this.nicknameService.nickname;
  readonly avatar = this.nicknameService.avatar;

  session = signal<Session | undefined>(undefined);
  items = signal<CampItem[]>([]);
  loading = signal(true);
  activeFilter = signal<FilterCategory>('All');

  readonly categories = CATEGORIES;
  private itemsChannel?: RealtimeChannel;

  participants = computed(() => {
    const me = this.nicknameService.nickname() ?? 'Anonymous';
    const names = this.items().map(i => i.addedBy).filter(Boolean);
    return [...new Set([me, ...names])];
  });

  filteredItems  = computed(() => {
    const f = this.activeFilter();
    return f === 'All' ? this.items() : this.items().filter(i => i.category === f);
  });
  pendingItems   = computed(() => this.filteredItems().filter(i => !i.bought));
  boughtItems    = computed(() => this.filteredItems().filter(i => i.bought));
  totalCount     = computed(() => this.items().length);
  boughtCount    = computed(() => this.items().filter(i => i.bought).length);
  progressPercent = computed(() => {
    const total = this.totalCount();
    return total === 0 ? 0 : Math.round((this.boughtCount() / total) * 100);
  });

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

  categoryEmoji(cat: ItemCategory): string { return CATEGORY_EMOJIS[cat] ?? '📦'; }

  countByCategory(cat: ItemCategory): number {
    return this.items().filter(i => i.category === cat).length;
  }

  async onItemAdded(item: Omit<CampItem, 'id'>): Promise<void> {
    const id = this.sessionId();
    if (id) await this.supabaseService.addItem(id, item);
  }

  async onMarkBought(itemId: string): Promise<void> {
    await this.supabaseService.updateItem(itemId, {
      bought: true,
      boughtBy: this.nicknameService.nickname() ?? 'Someone',
      boughtAt: Date.now(),
    });
  }

  async onUnmarkBought(itemId: string): Promise<void> {
    await this.supabaseService.updateItem(itemId, {
      bought: false,
      boughtBy: undefined,
      boughtAt: undefined,
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

  leaveSession(): void { this.sessionService.clearSession(); }
}
