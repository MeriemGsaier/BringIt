import { Component, inject, output, input, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CampItem, ItemCategory, CATEGORIES } from '../../core/models/item.model';
import { NicknameService } from '../../core/services/nickname.service';

@Component({
  selector: 'app-add-item',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        (click)="closed.emit()"
      >
        <div
          class="bg-white rounded-2xl shadow-xl w-full max-w-md p-5"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-bark-800 text-lg">Add Item</h3>
            <button
              (click)="closed.emit()"
              class="text-bark-400 hover:text-bark-600 text-2xl leading-none"
            >&times;</button>
          </div>

          <form (ngSubmit)="submit()" class="space-y-3">
            <div class="flex gap-2">
              <input
                class="input-field flex-1"
                type="text"
                [(ngModel)]="name"
                name="itemName"
                placeholder="Item name"
                maxlength="60"
                required
                autofocus
              />
              <input
                class="input-field w-20"
                type="number"
                [(ngModel)]="quantity"
                name="quantity"
                min="1"
                max="999"
                placeholder="Qty"
              />
            </div>
            <div class="flex gap-2">
              <select class="input-field flex-1" [(ngModel)]="category" name="category">
                @for (cat of categories; track cat) {
                  <option [value]="cat">{{ cat }}</option>
                }
              </select>
              <select class="input-field flex-1" [(ngModel)]="assignedTo" name="assignedTo">
                <option value="">Me ({{ currentNickname() }})</option>
                @for (person of otherParticipants(); track person) {
                  <option [value]="person">{{ person }}</option>
                }
              </select>
            </div>
            <button type="submit" class="btn-primary w-full" [disabled]="!name.trim()">
              Add to List
            </button>
          </form>
        </div>
      </div>
    }
  `,
})
export class AddItemComponent {
  private nicknameService = inject(NicknameService);

  readonly isOpen       = input<boolean>(false);
  readonly participants = input<string[]>([]);
  readonly itemAdded    = output<Omit<CampItem, 'id'>>();
  readonly closed       = output<void>();

  readonly categories = CATEGORIES;
  name = '';
  quantity = 1;
  category: ItemCategory = 'Food';
  assignedTo = '';

  readonly currentNickname = computed(() => this.nicknameService.nickname() ?? 'Anonymous');
  readonly otherParticipants = computed(() =>
    this.participants().filter(p => p !== this.currentNickname())
  );

  submit(): void {
    if (!this.name.trim()) return;
    const nickname = this.currentNickname();
    this.itemAdded.emit({
      name: this.name.trim(),
      category: this.category,
      quantity: this.quantity || 1,
      assignedTo: this.assignedTo.trim() || nickname,
      bought: false,
      addedBy: nickname,
      createdAt: Date.now(),
    });
    this.name = '';
    this.quantity = 1;
    this.assignedTo = '';
    this.closed.emit();
  }
}
