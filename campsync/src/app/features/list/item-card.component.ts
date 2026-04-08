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
      [class.opacity-60]="item.bought && !editing()"
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
        <!-- Category Badge -->
        <div class="flex-shrink-0 mt-0.5">
          <span class="badge {{ colors.bg }} {{ colors.text }} border {{ colors.border }}">
            {{ categoryEmoji(item.category) }} {{ item.category }}
          </span>
        </div>

        <!-- Main content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="font-semibold text-bark-800 leading-snug" [class.line-through]="item.bought">
                {{ item.name }}
              </p>
              <p class="text-sm text-bark-500 mt-0.5">
                Qty: <span class="font-medium text-bark-700">{{ item.quantity }}</span>
                &nbsp;·&nbsp;
                For: <span class="font-medium text-bark-700">{{ item.assignedTo }}</span>
              </p>
              @if (item.bought && item.boughtBy) {
                <p class="text-xs text-forest-600 mt-1 font-medium">
                  ✅ Bought by {{ item.boughtBy }}
                </p>
              }
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1 flex-shrink-0">
              @if (!item.bought) {
                <button
                  (click)="markBought.emit(item.id)"
                  class="btn-primary text-sm px-3 py-1.5 whitespace-nowrap"
                  title="Mark as bought"
                >
                  Mark Bought
                </button>
              } @else {
                <button
                  (click)="unmarkBought.emit(item.id)"
                  class="btn-ghost text-sm px-3 py-1.5 text-forest-700 whitespace-nowrap"
                  title="Undo"
                >
                  Undo
                </button>
              }
              <button
                (click)="startEdit()"
                class="btn-ghost text-sm px-2 py-1.5 text-bark-400 hover:text-bark-700"
                title="Edit item"
              >✏️</button>
              <button
                (click)="confirming.set(true)"
                class="btn-ghost text-sm px-2 py-1.5 text-red-400 hover:text-red-600"
                title="Remove item"
              >✕</button>
            </div>
          </div>
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

  readonly campItem = input.required<CampItem>();
  readonly participants = input<string[]>([]);
  readonly markBought = output<string>();
  readonly unmarkBought = output<string>();
  readonly deleteItem = output<string>();
  readonly editItem = output<{ id: string; changes: Partial<CampItem> }>();

  readonly categories = CATEGORIES;
  readonly editing = signal(false);
  readonly confirming = signal(false);

  editName = '';
  editQuantity = 1;
  editCategory: ItemCategory = 'Food';
  editAssignedTo = '';

  readonly currentNickname = computed(() => this.nicknameService.nickname() ?? 'Anonymous');

  readonly allParticipants = computed(() => {
    const me = this.currentNickname();
    return [me, ...this.participants().filter(p => p !== me)];
  });

  startEdit(): void {
    const item = this.campItem();
    this.editName = item.name;
    this.editQuantity = item.quantity;
    this.editCategory = item.category;
    this.editAssignedTo = item.assignedTo;
    this.confirming.set(false);
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  saveEdit(): void {
    if (!this.editName.trim()) return;
    this.editItem.emit({
      id: this.campItem().id,
      changes: {
        name: this.editName.trim(),
        quantity: this.editQuantity || 1,
        category: this.editCategory,
        assignedTo: this.editAssignedTo,
      },
    });
    this.editing.set(false);
  }

  categoryColors(cat: CampItem['category']) {
    return CATEGORY_COLORS[cat] ?? { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };
  }

  categoryEmoji(cat: CampItem['category']): string {
    return CATEGORY_EMOJIS[cat] ?? '📦';
  }
}
