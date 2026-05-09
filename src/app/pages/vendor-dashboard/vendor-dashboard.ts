import {
  Component, signal, OnInit, computed, inject, HostListener
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Auth } from '../../services/auth';
import { EGYPT_DATA, GOVERNORATES } from '../../data';
import { NotificationBell } from "../notification-bell/notification-bell";
import { NotificationService } from '../../services/notification-service';

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
  beforeImageUrls: string[];
  afterImageUrls: string[];
  isPaid: boolean;
  price?: number;
}

interface AfterImagePreview {
  file: File;
  previewUrl: string;
}

type ActiveTab = 'my-tasks' | 'new-tickets' | 'profile';
type ModalStep = 'details' | 'complete-form';

@Component({
  selector: 'app-vendor-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, NotificationBell],
  templateUrl: './vendor-dashboard.html',
  styleUrl: './vendor-dashboard.scss',
})
export class VendorDashboard implements OnInit {
  private http = inject(HttpClient);
  private ns = inject(NotificationService);
  readonly API_URL = 'http://localhost:5001';

  activeTab = signal<ActiveTab>('my-tasks');
  myTickets = signal<Ticket[]>([]);
  loadingMyTickets = signal(true);
  newTickets = signal<Ticket[]>([]);
  loadingNewTickets = signal(false);
  selectedTicket = signal<Ticket | null>(null);

  modalStep = signal<ModalStep>('details');
  imagesTab = signal<'before' | 'after'>('before');

  afterImagePreviews = signal<AfterImagePreview[]>([]);
  completingId = signal<string | null>(null);

  // ── حقل السعر ────────────────────────────────────────
  completionPrice = signal<number | null>(null);
  priceError = signal('');

  previewImage = signal<string | null>(null);
  currentImageIndex = signal(0);
  _currentImages: string[] = [];

  readonly governorates = GOVERNORATES;
  filterCities = signal<string[]>([]);
  selectedGovernorate = signal('');
  selectedCity = signal('');
  newTicketsStatusFilter = signal<'pending' | 'all'>('all');
  applyingId = signal<string | null>(null);

  priorityMap: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    Low: { label: 'منخفضة', color: '#15803d', bg: '#dcfce7', dot: '#22c55e' },
    Medium: { label: 'متوسطة', color: '#b45309', bg: '#fef9c3', dot: '#eab308' },
    High: { label: 'عالية', color: '#b91c1c', bg: '#fee2e2', dot: '#ef4444' },
    Emergency: { label: 'طارئة', color: '#9a3412', bg: '#ffedd5', dot: '#f97316' },
    Critical: { label: 'حرجة', color: '#6d28d9', bg: '#ede9fe', dot: '#8b5cf6' },
  };

  statusMap: Record<string, { label: string; color: string; bg: string }> = {
    Pending: { label: 'انتظار', color: '#b45309', bg: '#fef9c3' },
    vendorAccepted: { label: 'جارٍ التنفيذ', color: '#1d4ed8', bg: '#dbeafe' },
    Resolved: { label: 'تم الإنجاز', color: '#15803d', bg: '#dcfce7' },
    Closed: { label: 'مغلق', color: '#4b5563', bg: '#f3f4f6' },
  };

  firstName = computed(() => {
    const name = this.auth.currentUser()?.fullName;
    return name ? name.split(' ')[0] : 'الفني';
  });

  myTaskStats = computed(() => {
    const t = this.myTickets();
    return {
      total: t.length,
      inProgress: t.filter(x => x.status === 'vendorAccepted').length,
      resolved: t.filter(x => x.status === 'Resolved' || x.status === 'Closed').length,
      emergency: t.filter(x => x.priority === 'Emergency').length,
    };
  });

  filteredNewTickets = computed(() => {
    const f = this.newTicketsStatusFilter();
    return f === 'pending' ? this.newTickets().filter(t => t.status === 'Pending') : this.newTickets();
  });

  newTicketsStats = computed(() => {
    const t = this.newTickets();
    return { total: t.length, pending: t.filter(x => x.status === 'Pending').length };
  });

  constructor(public auth: Auth) {}

  ngOnInit() {
    this.loadMyTickets();
    this.loadCurrentUserProfile();
    const token = localStorage.getItem('token');
    if (token) this.ns.connect(token);
  }

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private loadCurrentUserProfile() {
    const vendorId = this.getVendorId();
    if (!vendorId) return;
    this.http.get<any>(
      `${this.API_URL}/api/Vendors/${vendorId}/profile`,
      { headers: this.headers() }
    ).subscribe({
      next: (profile) => {
        const current = this.auth.currentUser();
        if (!current) return;
        const updated = {
          ...current,
          profileImageUrl: profile.imageUrl ?? current.profileImageUrl ?? null,
          phone: profile.phone ?? current.phone ?? null,
        };
        localStorage.setItem('user', JSON.stringify(updated));
        this.auth.currentUser.set(updated);
      },
      error: () => {}
    });
  }

  private getVendorId(): string {
    const token = localStorage.getItem('token');
    if (!token) return '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub ?? '';
    } catch { return ''; }
  }

  loadMyTickets() {
    this.loadingMyTickets.set(true);
    this.http.get<Ticket[]>(`${this.API_URL}/api/Tickets`, { headers: this.headers() }).subscribe({
      next: d => { this.myTickets.set(d); this.loadingMyTickets.set(false); },
      error: e => { console.error(e); this.loadingMyTickets.set(false); },
    });
  }

  loadNewTickets() {
    this.loadingNewTickets.set(true);
    let params = new HttpParams();
    if (this.selectedGovernorate()) params = params.set('governorate', this.selectedGovernorate());
    if (this.selectedCity()) params = params.set('city', this.selectedCity());
    this.http.get<Ticket[]>(`${this.API_URL}/api/Tickets/pending`, { headers: this.headers(), params }).subscribe({
      next: d => { this.newTickets.set(d); this.loadingNewTickets.set(false); },
      error: e => { console.error(e); this.loadingNewTickets.set(false); },
    });
  }

  switchTab(tab: ActiveTab) {
    this.activeTab.set(tab);
    if (tab === 'new-tickets' && this.newTickets().length === 0) this.loadNewTickets();
  }

  onGovernorateChange(gov: string) {
    this.selectedGovernorate.set(gov);
    this.selectedCity.set('');
    this.filterCities.set(EGYPT_DATA[gov] ?? []);
    this.loadNewTickets();
  }

  onCityChange(city: string) { this.selectedCity.set(city); this.loadNewTickets(); }

  clearFilters() {
    this.selectedGovernorate.set('');
    this.selectedCity.set('');
    this.filterCities.set([]);
    this.loadNewTickets();
  }

  openTicket(t: Ticket) {
    this.selectedTicket.set(t);
    this.modalStep.set('details');
    this.imagesTab.set('before');
    this.currentImageIndex.set(0);
    this._clearAfterPreviews();
    this.completionPrice.set(null);
    this.priceError.set('');
  }

  closeTicket() {
    this.selectedTicket.set(null);
    this._clearAfterPreviews();
    this.completionPrice.set(null);
    this.priceError.set('');
    this.closeImage();
  }

  goToCompleteForm() { this.modalStep.set('complete-form'); }
  backToDetails() { this.modalStep.set('details'); }

  onAfterImagesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    const added: AfterImagePreview[] = Array.from(input.files).map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    this.afterImagePreviews.update(prev => [...prev, ...added]);
    input.value = '';
  }

  removeAfterImage(index: number) {
    this.afterImagePreviews.update(prev => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  private _clearAfterPreviews() {
    this.afterImagePreviews().forEach(p => URL.revokeObjectURL(p.previewUrl));
    this.afterImagePreviews.set([]);
  }

  submitComplete() {
    const ticket = this.selectedTicket();
    if (!ticket || !this.afterImagePreviews().length) return;

    const price = this.completionPrice();
    if (!price || price <= 0) {
      this.priceError.set('لازم تدخل السعر الأول');
      return;
    }
    this.priceError.set('');
    this.completingId.set(ticket.id);

    const formData = new FormData();
    this.afterImagePreviews().forEach(p => formData.append('Images', p.file));
    formData.append('Price', price.toString());

    this.http.patch(
      `${this.API_URL}/api/Tickets/${ticket.id}/complete`,
      formData,
      { headers: new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token')}` }) }
    ).subscribe({
      next: () => {
        this.completingId.set(null);
        this._clearAfterPreviews();
        this.completionPrice.set(null);
        this.loadMyTickets();
        this.closeTicket();
      },
      error: e => { console.error(e); this.completingId.set(null); },
    });
  }

  applyToTicket(ticketId: string, event: Event) {
    event.stopPropagation();
    this.applyingId.set(ticketId);
    this.http.post(`${this.API_URL}/api/Tickets/${ticketId}/apply`, {}, { headers: this.headers() }).subscribe({
      next: () => { this.applyingId.set(null); this.loadNewTickets(); this.closeTicket(); },
      error: e => { console.error(e); this.applyingId.set(null); },
    });
  }

  openWhatsApp(phone: string) {
    const cleaned = phone?.replace(/\D/g, '');
    const intl = cleaned?.startsWith('0') ? '2' + cleaned : cleaned;
    window.open(`https://wa.me/${intl}`, '_blank');
  }

  callTenant(phone: string) { window.open(`tel:${phone}`, '_self'); }

  getPriority(v: string) { return this.priorityMap[v] ?? { label: v, color: '#4b5563', bg: '#f3f4f6', dot: '#9ca3af' }; }
  getStatus(v: string) { return this.statusMap[v] ?? { label: v, color: '#4b5563', bg: '#f3f4f6' }; }

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