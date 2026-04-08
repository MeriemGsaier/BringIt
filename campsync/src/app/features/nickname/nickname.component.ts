import { Component, inject, signal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NicknameService } from '../../core/services/nickname.service';

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
          <p class="text-bark-500 mt-1 text-sm">Enter a nickname so your friends know it's you.</p>
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
            Let's Go! 🏕️
          </button>
        </form>
      </div>
    </div>
  `,
})
export class NicknameComponent {
  private nicknameService = inject(NicknameService);
  readonly saved = output<string>();

  name = '';

  submit(): void {
    const trimmed = this.name.trim();
    if (!trimmed) return;
    this.nicknameService.setNickname(trimmed);
    this.saved.emit(trimmed);
  }
}
