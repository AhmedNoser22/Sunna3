import {
  Component, signal, OnInit, computed, inject
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from '../../services/auth';

interface AssignedTicket {
  id: string;
  description: string;
  status: string;
  priority: string;
  problemType: string;
  tenantLocation: string;
  arrival: string;
  deadline: string;
  createdAt: string;
  tenantName: string;
  imageUrls: string[];
}

type ActiveTab = 'assigned' | 'profile';

@Component({
  selector: 'app-vendor-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './vendor-dashboard.html',
  styleUrl: './vendor-dashboard.scss',
})
export class VendorDashboard implements OnInit {
  private http = inject(HttpClient);
  readonly API_URL = 'http://localhost:5001';

  // ─── State ───────────────────────────────────────────
  activeTab = signal<ActiveTab>('assigned');

  tickets = signal<AssignedTicket[]>([]);
  loadingTickets = signal(true);

  selectedTicket = signal<AssignedTicket | null>(null);
  previewImage = signal<string | null>(null);
  currentImageIndex = signal(0);
  private _currentImages: string[] = [];

  // ─── Status / Priority Maps ───────────────────────────
  priorityMap: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    Low:       { label: 'منخفضة', color: '#059669', bg: '#d1fae5', dot: '#10b981' },
    Medium:    { label: 'متوسطة', color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
    High:      { label: 'عالية',  color: '#dc2626', bg: '#fee2e2', dot: '#ef4444' },
    Emergency: { label: 'طارئة',  color: '#7c3aed', bg: '#ede9fe', dot: '#8b5cf6' },
  };

  statusMap: Record<string, { label: string; color: string; bg: string }> = {
    Pending:    { label: 'انتظار',       color: '#b45309', bg: '#fef3c7' },
    Assigned:   { label: 'محدد لك',      color: '#1d4ed8', bg: '#dbeafe' },
    InProgress: { label: 'جارٍ التنفيذ', color: '#0369a1', bg: '#e0f2fe' },
    Resolved:   { label: 'تم الحل',      color: '#059669', bg: '#d1fae5' },
    Closed:     { label: 'مغلق',         color: '#6b7280', bg: '#f3f4f6' },
  };

  // ─── Computed ─────────────────────────────────────────
  firstName = computed(() => {
    const name = this.auth.currentUser()?.fullName;
    return name ? name.split(' ')[0] : 'الفني';
  });

  ticketStats = computed(() => {
    const t = this.tickets();
    return {
      total:      t.length,
      inProgress: t.filter(x => x.status === 'InProgress' || x.status === 'Assigned').length,
      resolved:   t.filter(x => x.status === 'Resolved' || x.status === 'Closed').length,
      emergency:  t.filter(x => x.priority === 'Emergency').length,
    };
  });

  // ─── Lifecycle ────────────────────────────────────────
  constructor(public auth: Auth) {}

  ngOnInit() {
    this.loadMyTickets();
  }

  // ─── Data ─────────────────────────────────────────────
  private headers(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  loadMyTickets() {
    this.loadingTickets.set(true);
    // endpoint للـ tickets المسندة للفني الحالي
    this.http
      .get<AssignedTicket[]>(`${this.API_URL}/api/Tickets/my-tickets`, {
        headers: this.headers(),
      })
      .subscribe({
        next: d => { this.tickets.set(d); this.loadingTickets.set(false); },
        error: e => { console.error(e); this.loadingTickets.set(false); },
      });
  }

  // ─── Helpers ──────────────────────────────────────────
  getPriority(v: string) {
    return this.priorityMap[v] ?? { label: v, color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' };
  }

  getStatus(v: string) {
    return this.statusMap[v] ?? { label: v, color: '#6b7280', bg: '#f3f4f6' };
  }

  openTicket(t: AssignedTicket) { this.selectedTicket.set(t); this.currentImageIndex.set(0); }
  closeTicket()                  { this.selectedTicket.set(null); this.closeImage(); }

  switchTab(tab: ActiveTab) { this.activeTab.set(tab); }

  // ─── Image Viewer ─────────────────────────────────────
  openImage(images: string[], index: number) {
    this._currentImages = images;
    this.currentImageIndex.set(index);
    this.previewImage.set(images[index]);
  }

  closeImage() { this.previewImage.set(null); this._currentImages = []; }

  nextImage() {
    if (!this._currentImages.length) return;
    const n = (this.currentImageIndex() + 1) % this._currentImages.length;
    this.currentImageIndex.set(n);
    this.previewImage.set(this._currentImages[n]);
  }

  prevImage() {
    if (!this._currentImages.length) return;
    const p = (this.currentImageIndex() - 1 + this._currentImages.length) % this._currentImages.length;
    this.currentImageIndex.set(p);
    this.previewImage.set(this._currentImages[p]);
  }

  trackById(_: number, item: any) { return item.id; }
}