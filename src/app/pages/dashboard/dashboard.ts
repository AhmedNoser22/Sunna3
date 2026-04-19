import { Component, signal, OnInit, computed, inject, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { Api } from '../../services/api';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface Ticket {
  id: string;
  description: string;
  status: string;
  priority: string;
  problemType: string;
  tenantLocation: string;
  governorate: string;
  city: string;
  arrival: string;
  deadline: string;
  createdAt: string;
  tenantName: string;
  vendorName?: string;
  companyId: string;
  imageUrls: string[];
}

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  ticketId?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private http = inject(HttpClient);
  readonly API_URL = 'http://localhost:5001';

  tickets = signal<Ticket[]>([]);
  loading = signal(true);
  selectedTicket = signal<Ticket | null>(null);
  activeFilter = signal('all');
  previewImage = signal<string | null>(null);
  currentImageIndex = signal(0);
  private _currentImages: string[] = [];

  notifications = signal<Notification[]>([]);
  showNotifications = signal(false);

  unreadCount = computed(() => this.notifications().filter(n => !n.isRead).length);

  openImage(images: string[], index: number) {
    this._currentImages = images;
    this.currentImageIndex.set(index);
    this.previewImage.set(images[index]);
  }

  closeImage() {
    this.previewImage.set(null);
    this._currentImages = [];
  }

  nextImage() {
    const imgs = this._currentImages;
    if (!imgs.length) return;
    const next = (this.currentImageIndex() + 1) % imgs.length;
    this.currentImageIndex.set(next);
    this.previewImage.set(imgs[next]);
  }

  prevImage() {
    const imgs = this._currentImages;
    if (!imgs.length) return;
    const prev = (this.currentImageIndex() - 1 + imgs.length) % imgs.length;
    this.currentImageIndex.set(prev);
    this.previewImage.set(imgs[prev]);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    if (!this.previewImage()) return;
    switch (event.key) {
      case 'ArrowRight': this.nextImage(); break;
      case 'ArrowLeft': this.prevImage(); break;
      case 'Escape': this.closeImage(); break;
    }
  }

  firstName = computed(() => {
    const name = this.auth.currentUser()?.fullName;
    return name ? name.split(' ')[0] : 'مستخدم';
  });

  priorityMap: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    Low:      { label: 'منخفضة', color: '#10b981', bg: '#d1fae5', icon: '🟢' },
    Medium:   { label: 'متوسطة', color: '#f59e0b', bg: '#fef3c7', icon: '🟡' },
    High:     { label: 'عالية',  color: '#ef4444', bg: '#fee2e2', icon: '🔴' },
    Critical: { label: 'حرجة',  color: '#7c3aed', bg: '#ede9fe', icon: '🚨' },
  };

  statusMap: Record<string, { label: string; color: string; bg: string }> = {
    Pending:    { label: 'قيد الانتظار', color: '#d97706', bg: '#fef3c7' },
    Assigned:   { label: 'تم التكليف',   color: '#7c3aed', bg: '#ede9fe' },
    InProgress: { label: 'جارٍ التنفيذ', color: '#2563eb', bg: '#dbeafe' },
    Resolved:   { label: 'تم الحل',      color: '#059669', bg: '#d1fae5' },
    Closed:     { label: 'مغلق',         color: '#6b7280', bg: '#f3f4f6' },
  };

  problemIconMap: Record<string, string> = {
    Electrical: '⚡️', Plumbing: '🚿', AC: '❄️', Other: '🔧',
  };

  filteredTickets = computed(() => {
    const f = this.activeFilter();
    return f === 'all' ? this.tickets() : this.tickets().filter(t => t.status === f);
  });

  stats = computed(() => {
    const t = this.tickets();
    return {
      total:      t.length,
      pending:    t.filter(x => x.status === 'Pending').length,
      inProgress: t.filter(x => x.status === 'InProgress').length,
      done:       t.filter(x => x.status === 'Resolved' || x.status === 'Closed').length,
    };
  });

  constructor(public auth: Auth, private api: Api) {}

  ngOnInit() {
    this.loadTickets();
    this.loadNotifications();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  loadTickets() {
    this.loading.set(true);
    this.http.get<Ticket[]>(`${this.API_URL}/api/Tickets`, { headers: this.getHeaders() }).subscribe({
      next: (data) => { this.tickets.set(data); this.loading.set(false); },
      error: (err) => { console.error(err); this.loading.set(false); },
    });
  }

  loadNotifications() {
    this.http.get<Notification[]>(`${this.API_URL}/api/Notifications`, { headers: this.getHeaders() }).subscribe({
      next: (data) => this.notifications.set(data),
      error: (err) => console.error(err),
    });
  }

  toggleNotifications() {
    this.showNotifications.update(v => !v);
    if (this.showNotifications()) {
      this.markAllRead();
    }
  }

  markAllRead() {
    const unread = this.notifications().filter(n => !n.isRead);
    unread.forEach(n => {
      this.http.patch(`${this.API_URL}/api/Notifications/${n.id}/read`, {}, { headers: this.getHeaders() }).subscribe();
    });
    this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
  }

  getPriority(v: string) { return this.priorityMap[v] ?? { label: v, color: '#6b7280', bg: '#f3f4f6', icon: '⚪' }; }
  getStatus(v: string)   { return this.statusMap[v]   ?? { label: v, color: '#6b7280', bg: '#f3f4f6' }; }
  openTicket(t: Ticket)  { this.selectedTicket.set(t); this.currentImageIndex.set(0); }
  closeTicket()          { this.selectedTicket.set(null); this.closeImage(); }
}