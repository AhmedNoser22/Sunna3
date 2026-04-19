import {
  Component, signal, OnInit, computed, inject, HostListener
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Auth } from '../../services/auth';
import { EGYPT_DATA, GOVERNORATES } from '../../data';

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
  tenantPhone?: string;
  vendorName?: string;
  imageUrls: string[];
}

// [ADD] النوع الجديد للتبويبات
type ActiveTab = 'my-tasks' | 'new-tickets' | 'profile';

@Component({
  selector: 'app-vendor-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './vendor-dashboard.html',
  styleUrl: './vendor-dashboard.scss',
})
export class VendorDashboard implements OnInit {
  private http = inject(HttpClient);
  readonly API_URL = 'http://localhost:5001';

  // [KEEP] التبويب النشط
  activeTab = signal<ActiveTab>('my-tasks');

  // [KEEP] بيانات المهام الخاصة بالفيندور
  myTickets = signal<Ticket[]>([]);
  loadingMyTickets = signal(true);

  // [ADD] بيانات الطلبات الجديدة (Pending)
  newTickets = signal<Ticket[]>([]);
  loadingNewTickets = signal(false);

  // [KEEP] الموودال والصور
  selectedTicket = signal<Ticket | null>(null);
  previewImage = signal<string | null>(null);
  currentImageIndex = signal(0);
  private _currentImages: string[] = [];

  // [ADD] فلترة الطلبات الجديدة بالمحافظة والمدينة
  readonly governorates = GOVERNORATES;
  filterCities = signal<string[]>([]);
  selectedGovernorate = signal('');
  selectedCity = signal('');

  // [ADD] فلترة الحالة في الطلبات الجديدة (Pending فقط أو كل المحلول وغير محلول)
  newTicketsStatusFilter = signal<'pending' | 'all'>('all');

  // [KEEP] maps
  priorityMap: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    Low:       { label: 'منخفضة', color: '#059669', bg: '#d1fae5', dot: '#10b981' },
    Medium:    { label: 'متوسطة', color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
    High:      { label: 'عالية',  color: '#dc2626', bg: '#fee2e2', dot: '#ef4444' },
    Emergency: { label: 'طارئة',  color: '#7c3aed', bg: '#ede9fe', dot: '#8b5cf6' },
  };

  statusMap: Record<string, { label: string; color: string; bg: string }> = {
    Pending:    { label: 'انتظار',       color: '#b45309', bg: '#fef3c7' },
    Assigned:   { label: 'تم التكليف',   color: '#7c3aed', bg: '#ede9fe' },
    InProgress: { label: 'جارٍ التنفيذ', color: '#0369a1', bg: '#e0f2fe' },
    Resolved:   { label: 'تم الحل',      color: '#059669', bg: '#d1fae5' },
    Closed:     { label: 'مغلق',         color: '#6b7280', bg: '#f3f4f6' },
  };

  problemIconMap: Record<string, string> = {
    Electrical: '⚡️', Plumbing: '🚿', AC: '❄️', Other: '🔧',
  };

  // [KEEP] computed
  firstName = computed(() => {
    const name = this.auth.currentUser()?.fullName;
    return name ? name.split(' ')[0] : 'الفني';
  });

  // [KEEP] إحصائيات مهامي
  myTaskStats = computed(() => {
    const t = this.myTickets();
    return {
      total:      t.length,
      inProgress: t.filter(x => x.status === 'InProgress' || x.status === 'Assigned').length,
      resolved:   t.filter(x => x.status === 'Resolved' || x.status === 'Closed').length,
      emergency:  t.filter(x => x.priority === 'Emergency').length,
    };
  });

  // [ADD] الطلبات المفلترة في سكشن الطلبات الجديدة
  filteredNewTickets = computed(() => {
    const filter = this.newTicketsStatusFilter();
    const tickets = this.newTickets();
    if (filter === 'pending') return tickets.filter(t => t.status === 'Pending');
    return tickets;
  });

  // [ADD] إحصائيات الطلبات الجديدة
  newTicketsStats = computed(() => {
    const t = this.newTickets();
    return {
      total:    t.length,
      pending:  t.filter(x => x.status === 'Pending').length,
      resolved: t.filter(x => x.status === 'Resolved' || x.status === 'Closed').length,
    };
  });

  constructor(public auth: Auth) {}

  ngOnInit() {
    this.loadMyTickets();
  }

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // [KEEP] تحميل مهام الفيندور الخاصة بيه فقط
  loadMyTickets() {
    this.loadingMyTickets.set(true);
    this.http
      .get<Ticket[]>(`${this.API_URL}/api/Tickets`, { headers: this.headers() })
      .subscribe({
        next: d => { this.myTickets.set(d); this.loadingMyTickets.set(false); },
        error: e => { console.error(e); this.loadingMyTickets.set(false); },
      });
  }

  // [ADD] تحميل الطلبات الجديدة مع فلترة المحافظة والمدينة
  loadNewTickets() {
    this.loadingNewTickets.set(true);

    let params = new HttpParams();
    if (this.selectedGovernorate()) params = params.set('governorate', this.selectedGovernorate());
    if (this.selectedCity()) params = params.set('city', this.selectedCity());

    this.http
      .get<Ticket[]>(`${this.API_URL}/api/Tickets/pending`, {
        headers: this.headers(),
        params,
      })
      .subscribe({
        next: d => { this.newTickets.set(d); this.loadingNewTickets.set(false); },
        error: e => { console.error(e); this.loadingNewTickets.set(false); },
      });
  }

  // [ADD] لما يغير التبويب
  switchTab(tab: ActiveTab) {
    this.activeTab.set(tab);
    if (tab === 'new-tickets' && this.newTickets().length === 0) {
      this.loadNewTickets();
    }
  }

  // [ADD] لما يغير المحافظة في فلترة الطلبات الجديدة
  onGovernorateChange(gov: string) {
    this.selectedGovernorate.set(gov);
    this.selectedCity.set('');
    this.filterCities.set(EGYPT_DATA[gov] ?? []);
    this.loadNewTickets();
  }

  // [ADD] لما يغير المدينة
  onCityChange(city: string) {
    this.selectedCity.set(city);
    this.loadNewTickets();
  }

  // [ADD] مسح الفلتر
  clearFilters() {
    this.selectedGovernorate.set('');
    this.selectedCity.set('');
    this.filterCities.set([]);
    this.loadNewTickets();
  }

  // [ADD] قبول التيكيت
  acceptTicket(ticketId: string, event: Event) {
    event.stopPropagation();
    this.http
      .patch(`${this.API_URL}/api/Tickets/${ticketId}/accept`, {}, { headers: this.headers() })
      .subscribe({
        next: () => {
          // [ADD] بعد القبول: أحدّث القائمتين
          this.loadNewTickets();
          this.loadMyTickets();
          this.closeTicket();
        },
        error: e => console.error(e),
      });
  }

  // [ADD] واتساب واتصال
  openWhatsApp(phone: string) {
    const cleaned = phone?.replace(/\D/g, '');
    const intl = cleaned?.startsWith('0') ? '2' + cleaned : cleaned;
    window.open(`https://wa.me/${intl}`, '_blank');
  }

  callTenant(phone: string) {
    window.open(`tel:${phone}`, '_self');
  }

  // [KEEP] helpers
  getPriority(v: string) {
    return this.priorityMap[v] ?? { label: v, color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' };
  }

  getStatus(v: string) {
    return this.statusMap[v] ?? { label: v, color: '#6b7280', bg: '#f3f4f6' };
  }

  openTicket(t: Ticket) { this.selectedTicket.set(t); this.currentImageIndex.set(0); }
  closeTicket()          { this.selectedTicket.set(null); this.closeImage(); }

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

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    if (!this.previewImage()) return;
    switch (event.key) {
      case 'ArrowRight': this.nextImage(); break;
      case 'ArrowLeft': this.prevImage(); break;
      case 'Escape': this.closeImage(); break;
    }
  }

  trackById(_: number, item: Ticket) { return item.id; }
}