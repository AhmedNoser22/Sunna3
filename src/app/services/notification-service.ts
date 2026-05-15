import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';

export type NotificationType =
  | 'NewTicket'
  | 'TicketStatusChanged'
  | 'VendorAssigned'
  | 'VendorInvited';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private hub: signalR.HubConnection | null = null;

  // ── state ──────────────────────────────────────────────
  notifications = signal<AppNotification[]>([]);
  unreadCount   = computed(() => this.notifications().filter(n => !n.isRead).length);

  // ── init ───────────────────────────────────────────────
  connect(token: string) {
    if (this.hub) return; // already connected

    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/notifications`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.hub.on('ReceiveNotification', (notification: AppNotification) => {
      this.notifications.update(list => [notification, ...list]);
    });

    this.hub.start().catch(err => console.error('SignalR error:', err));

    // load existing notifications from REST
    this.loadNotifications();
  }

  disconnect() {
    this.hub?.stop();
    this.hub = null;
    this.notifications.set([]);
  }

  // ── REST ───────────────────────────────────────────────
  private headers(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  loadNotifications() {
    this.http
      .get<AppNotification[]>(`${environment.apiUrl}/api/notifications`, {
        headers: this.headers(),
      })
      .subscribe({ next: data => this.notifications.set(data) });
  }

  markAsRead(id: string) {
    // optimistic update
    this.notifications.update(list =>
      list.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
    this.http
      .patch(`${environment.apiUrl}/api/notifications/${id}/read`, {}, {
        headers: this.headers(),
      })
      .subscribe();
  }

  markAllAsRead() {
    this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
    this.http
      .patch(`${environment.apiUrl}/api/notifications/read-all`, {}, {
        headers: this.headers(),
      })
      .subscribe();
  }

  // ── icon helper (used in template) ───────────────────
  iconFor(type: NotificationType): string {
    const map: Record<NotificationType, string> = {
      NewTicket:            '🔔',
      TicketStatusChanged:  '🔄',
      VendorAssigned:       '🔧',
      VendorInvited:        '👷',
    };
    return map[type] ?? '📩';
  }
}