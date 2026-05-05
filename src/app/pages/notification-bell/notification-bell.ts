import {
  Component, inject, signal, HostListener, computed
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NotificationService } from '../../services/notification-service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
<div class="nb-wrap">
  <!-- زر الجرس -->
  <button class="nb-bell" (click)="toggleOpen()" [class.nb-bell--active]="open()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
    @if (ns.unreadCount() > 0) {
      <span class="nb-badge">{{ ns.unreadCount() > 99 ? '99+' : ns.unreadCount() }}</span>
    }
  </button>

  <!-- dropdown -->
  @if (open()) {
  <div class="nb-dropdown" (click)="$event.stopPropagation()">
    <div class="nb-header">
      <span class="nb-title">الإشعارات</span>
      @if (ns.unreadCount() > 0) {
        <button class="nb-mark-all" (click)="markAll()">تحديد الكل كمقروء</button>
      }
    </div>

    <div class="nb-list">
      @if (ns.notifications().length === 0) {
        <div class="nb-empty">
          <span>🔕</span>
          <p>لا توجد إشعارات</p>
        </div>
      }
      @for (n of ns.notifications(); track n.id) {
        <div class="nb-item" [class.nb-item--unread]="!n.isRead" (click)="read(n.id)">
          <span class="nb-item-icon">{{ ns.iconFor(n.type) }}</span>
          <div class="nb-item-body">
            <p class="nb-item-title">{{ n.title }}</p>
            <p class="nb-item-body-text">{{ n.body }}</p>
            <span class="nb-item-time">{{ n.createdAt | date:'dd/MM — hh:mm a' }}</span>
          </div>
          @if (!n.isRead) {
            <span class="nb-dot"></span>
          }
        </div>
      }
    </div>
  </div>
  }
</div>
  `,
  styleUrl: './notification-bell.scss'
})
export class NotificationBell {
  ns   = inject(NotificationService);
  open = signal(false);

  toggleOpen() { this.open.update(v => !v); }

  read(id: string)  { this.ns.markAsRead(id); }
  markAll()         { this.ns.markAllAsRead(); }

  @HostListener('document:click')
  onDocClick() { this.open.set(false); }
}