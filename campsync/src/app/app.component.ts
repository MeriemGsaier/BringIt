import { Component, inject, computed } from '@angular/core';
import { NicknameService } from './core/services/nickname.service';
import { SessionService } from './core/services/session.service';
import { NicknameComponent } from './features/nickname/nickname.component';
import { SessionComponent } from './features/session/session.component';
import { ListComponent } from './features/list/list.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NicknameComponent, SessionComponent, ListComponent],
  template: `
    @if (!hasNickname()) {
      <app-nickname />
    }

    @if (hasNickname() && !hasSession()) {
      <app-session />
    }

    @if (hasNickname() && hasSession()) {
      <app-list />
    }
  `,
})
export class AppComponent {
  private nicknameService = inject(NicknameService);
  private sessionService = inject(SessionService);

  hasNickname = computed(() => this.nicknameService.hasNickname());
  hasSession  = computed(() => this.sessionService.hasSession());

}
