import { Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NicknameService, AVATARS } from '../../core/services/nickname.service';

@Component({
  selector: 'app-nickname',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="fixed inset-0 bg-bark-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div class="text-center mb-6">
          <div class="text-5xl mb-3">⛺</div>
          <h2 class="text-2xl font-bold text-bark-800">Welcome to BringIt!</h2>
          <p class="text-bark-500 mt-1 text-sm">Pick an avatar and choose a nickname.</p>
        </div>

        <!-- Avatar picker -->
        <div class="mb-5">
          <p class="text-xs font-semibold text-bark-500 uppercase tracking-wider mb-2 text-center">Choose your avatar</p>
          <div class="grid grid-cols-4 gap-2">
            @for (av of avatars; track av) {
              <button
                type="button"
                class="text-3xl w-14 h-14 rounded-xl flex items-center justify-center transition-all border-2 mx-auto"
                [class.border-forest-500]="selectedAvatar === av"
                [class.bg-forest-50]="selectedAvatar === av"
                [class.border-transparent]="selectedAvatar !== av"
                [class.bg-bark-50]="selectedAvatar !== av"
                [class.hover:bg-bark-100]="selectedAvatar !== av"
                (click)="selectedAvatar = av"
              >{{ av }}</button>
            }
          </div>
        </div>

        <form (ngSubmit)="submit()" #f="ngForm">
          <input
            class="input-field mb-4 text-center text-lg"
            type="text"
            [(ngModel)]="name"
            name="nickname"
            placeholder="e.g. TrailBlazer42"
            maxlength="20"
            required
            autofocus
          />
          <button
            type="submit"
            class="btn-primary w-full text-base"
            [disabled]="!name.trim()"
          >
            {{ selectedAvatar }} Let's Go!
          </button>
        </form>
      </div>
    </div>
  `,
})
export class NicknameComponent {
  private nicknameService = inject(NicknameService);
  readonly saved = output<string>();

  readonly avatars = AVATARS;
  selectedAvatar = AVATARS[0];
  name = '';

  submit(): void {
    const trimmed = this.name.trim();
    if (!trimmed) return;
    this.nicknameService.setNickname(trimmed);
    this.nicknameService.setAvatar(this.selectedAvatar);
    this.saved.emit(trimmed);
  }
}
