import { Component, input, output } from '@angular/core';
import { CampItem, CATEGORY_COLORS, CATEGORY_EMOJIS } from '../../core/models/item.model';

@Component({
  selector: 'app-item-card',
  standalone: true,
  template: `
    @let item = campItem();
    @let colors = categoryColors(item.category);
    <div
      class="card flex items-start gap-3 transition-all duration-300"
      [class.opacity-60]="item.bought"
    >
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
              (click)="delete.emit(item.id)"
              class="btn-ghost text-sm px-2 py-1.5 text-red-400 hover:text-red-600"
              title="Remove item"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ItemCardComponent {
  readonly campItem = input.required<CampItem>();
  readonly markBought = output<string>();
  readonly unmarkBought = output<string>();
  readonly delete = output<string>();

  categoryColors(cat: CampItem['category']) {
    return CATEGORY_COLORS[cat] ?? { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };
  }

  categoryEmoji(cat: CampItem['category']): string {
    return CATEGORY_EMOJIS[cat] ?? '📦';
  }
}
