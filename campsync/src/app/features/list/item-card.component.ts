import { Component, inject, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CampItem, ItemCategory, CATEGORIES, CATEGORY_COLORS, CATEGORY_EMOJIS } from '../../core/models/item.model';
import { NicknameService } from '../../core/services/nickname.service';

@Component({
  selector: 'app-item-card',
  standalone: true,
  imports: [FormsModule],
  template: `
    @let item = campItem();
    @let colors = categoryColors(item.category);
    <div
      class="card flex items-start gap-3 transition-all duration-300"
      [class.opacity-50]="item.bought && !editing() && !buyingMode()"
    >
      @if (editing()) {
        <!-- Edit mode -->
        <div class="flex-1 space-y-2">
          <div class="flex gap-2">
            <input
              class="input-field flex-1 text-sm"
              type="text"
              [(ngModel)]="editName"
              placeholder="Item name"
              maxlength="60"
              autofocus
            />
            <input
              class="input-field w-16 text-sm"
              type="number"
              [(ngModel)]="editQuantity"
              min="1"
              max="999"
            />
          </div>
          <div class="flex gap-2">
            <select class="input-field flex-1 text-sm" [(ngModel)]="editCategory">
              @for (cat of categories; track cat) {
                <option [value]="cat">{{ cat }}</option>
              }
            </select>
            <select class="input-field flex-1 text-sm" [(ngModel)]="editAssignedTo">
              @for (person of allParticipants(); track person) {
                <option [value]="person">
                  {{ person === currentNickname() ? 'Me (' + person + ')' : person }}
                </option>
              }
            </select>
          </div>
          <div class="flex gap-2 items-center">
            <input
              class="input-field flex-1 text-sm"
              type="number"
              [(ngModel)]="editPrice"
              placeholder="Price (optional)"
              min="0"
              step="0.01"
            />
            <span class="text-xs text-bark-400 flex-shrink-0">price</span>
          </div>
          <div class="flex gap-2 justify-end">
            <button (click)="cancelEdit()" class="btn-ghost text-sm px-3 py-1.5">Cancel</button>
            <button
              (click)="saveEdit()"
              class="btn-primary text-sm px-3 py-1.5"
              [disabled]="!editName.trim()"
            >Save</button>
          </div>
        </div>
      } @else {

        <!-- Checkbox -->
        <button
          (click)="toggleBought()"
          class="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 transition-all duration-200 flex items-center justify-center"
          [class.bg-forest-600]="item.bought"
          [class.border-forest-600]="item.bought"
          [class.border-bark-300]="!item.bought"
          [class.hover:border-forest-400]="!item.bought"
          title="{{ item.bought ? 'Mark as not bought' : 'Mark as bought' }}"
        >
          @if (item.bought) {
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
          }
        </button>

        <!-- Main content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="badge {{ colors.bg }} {{ colors.text }} border {{ colors.border }}">
                  {{ categoryEmoji(item.category) }} {{ item.category }}
                </span>
              </div>
              <p class="font-semibold text-bark-800 leading-snug mt-1" [class.line-through]="item.bought" [class.text-bark-400]="item.bought">
                {{ item.name }}
              </p>
              <p class="text-sm text-bark-500 mt-0.5">
                Qty: <span class="font-medium text-bark-700">{{ item.quantity }}</span>
                &nbsp;·&nbsp;
                For: <span class="font-medium text-bark-700">{{ item.assignedTo }}</span>
              </p>
              @if (item.bought && item.boughtBy) {
                <p class="text-xs text-forest-600 mt-1 font-medium">
                  Bought by {{ item.boughtBy }}@if (item.price != null) { · {{ item.price.toFixed(2) }} }
                </p>
              }
            </div>

            <!-- Three-dot menu -->
            <div class="relative flex-shrink-0">
              <button
                (click)="menuOpen.set(!menuOpen())"
                class="w-8 h-8 flex items-center justify-center rounded-lg text-bark-400 hover:text-bark-700 hover:bg-bark-100 transition-colors"
                title="More options"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z"/>
                </svg>
              </button>

              @if (menuOpen()) {
                <div class="fixed inset-0 z-10" (click)="menuOpen.set(false)"></div>
                <div class="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-bark-100 py-1 min-w-[130px]">
                  <button
                    (click)="startEdit(); menuOpen.set(false)"
                    class="w-full text-left px-4 py-2 text-sm text-bark-700 hover:bg-bark-50 flex items-center gap-2 transition-colors"
                  >
                    <span>✏️</span> Edit
                  </button>
                  <button
                    (click)="confirming.set(true); menuOpen.set(false)"
                    class="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <span>🗑️</span> Delete
                  </button>
                </div>
              }
            </div>

          </div>

          <!-- Inline buy confirmation with price input -->
          @if (buyingMode()) {
            <div class="mt-3 pt-3 border-t border-bark-100">
              <p class="text-sm font-medium text-bark-700 mb-2">Add price? (optional)</p>
              <div class="flex items-center gap-2">
                <input
                  class="input-field flex-1 text-sm"
                  type="number"
                  [(ngModel)]="pendingPrice"
                  placeholder="e.g. 12.50"
                  min="0"
                  step="0.01"
                  autofocus
                />
                <button (click)="confirmBought()" class="btn-primary text-sm px-3 py-1.5 flex-shrink-0">
                  Got it!
                </button>
                <button (click)="buyingMode.set(false)" class="btn-ghost text-sm px-3 py-1.5 flex-shrink-0">
                  Cancel
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Delete confirmation modal -->
    @if (confirming()) {
      <div
        class="fixed inset-0 bg-bark-900/40 flex items-center justify-center z-50 p-4"
        (click)="confirming.set(false)"
      >
        <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs" (click)="$event.stopPropagation()">
          <div class="text-center mb-4">
            <div class="text-4xl mb-3">🗑️</div>
            <h3 class="text-lg font-bold text-bark-800">Remove item?</h3>
            <p class="text-bark-500 text-sm mt-1">
              "<span class="font-medium text-bark-700">{{ item.name }}</span>" will be permanently removed from the list.
            </p>
          </div>
          <div class="flex gap-3">
            <button
              (click)="confirming.set(false)"
              class="btn-ghost flex-1 text-sm py-2"
            >Cancel</button>
            <button
              (click)="deleteItem.emit(item.id); confirming.set(false)"
              class="flex-1 text-sm py-2 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
            >Delete</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ItemCardComponent {
  private nicknameService = inject(NicknameService);

  readonly campItem    = input.required<CampItem>();
  readonly participants = input<string[]>([]);
  readonly markBought  = output<{ id: string; price?: number }>();
  readonly unmarkBought = output<string>();
  readonly deleteItem  = output<string>();
  readonly editItem    = output<{ id: string; changes: Partial<CampItem> }>();

  readonly categories = CATEGORIES;
  readonly editing    = signal(false);
  readonly confirming = signal(false);
  readonly menuOpen   = signal(false);
  readonly buyingMode = signal(false);

  editName       = '';
  editQuantity   = 1;
  editCategory: ItemCategory = 'Food';
  editAssignedTo = '';
  editPrice: number | null = null;
  pendingPrice: number | null = null;

  readonly currentNickname = computed(() => this.nicknameService.nickname() ?? 'Anonymous');

  readonly allParticipants = computed(() => {
    const me = this.currentNickname();
    return [me, ...this.participants().filter(p => p !== me)];
  });

  toggleBought(): void {
    const item = this.campItem();
    if (item.bought) {
      this.unmarkBought.emit(item.id);
    } else if (!this.buyingMode()) {
      this.pendingPrice = null;
      this.buyingMode.set(true);
    }
  }

  confirmBought(): void {
    this.markBought.emit({
      id: this.campItem().id,
      price: this.pendingPrice != null && this.pendingPrice > 0 ? this.pendingPrice : undefined,
    });
    this.buyingMode.set(false);
    this.pendingPrice = null;
  }

  startEdit(): void {
    const item = this.campItem();
    this.editName       = item.name;
    this.editQuantity   = item.quantity;
    this.editCategory   = item.category;
    this.editAssignedTo = item.assignedTo;
    this.editPrice      = item.price ?? null;
    this.confirming.set(false);
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  saveEdit(): void {
    if (!this.editName.trim()) return;
    const changes: Partial<CampItem> = {
      name:       this.editName.trim(),
      quantity:   this.editQuantity || 1,
      category:   this.editCategory,
      assignedTo: this.editAssignedTo,
    };
    if (this.editPrice != null && this.editPrice > 0) {
      changes.price = this.editPrice;
    } else {
      changes.price = undefined;
    }
    this.editItem.emit({ id: this.campItem().id, changes });
    this.editing.set(false);
  }

  categoryColors(cat: CampItem['category']) {
    return CATEGORY_COLORS[cat] ?? { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };
  }

  categoryEmoji(cat: CampItem['category']): string {
    return CATEGORY_EMOJIS[cat] ?? '📦';
  }
}
