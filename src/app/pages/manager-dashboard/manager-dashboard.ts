import {
  Component, signal, OnInit, computed, inject, HostListener
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../services/auth';
import { NotificationBell } from "../notification-bell/notification-bell";
import { NotificationService } from '../../services/notification-service';

interface Ticket {
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
  tenantId: string;
  vendorName?: string;
  vendorId?: string;
  companyId: string;
  beforeImageUrls: string[];
  afterImageUrls: string[];
}

interface Vendor {
  id?: string;
  fullName: string;
  phone: string;
  specialty: string;
  yearsExperience: number;
  bio?: string;
  createdAt: string;
  idCardFront?: string;
  idCardBack?: string;
}

interface Tenant {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  createdAt: string;
}

type ActiveTab = 'tickets' | 'vendors' | 'invitations' | 'review' | 'users';
type UsersSubTab = 'tenants' | 'vendors';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, NotificationBell],
  templateUrl: './manager-dashboard.html',
  styleUrl: './manager-dashboard.scss',
})
export class Dashboard implements OnInit {
  private http = inject(HttpClient);
  private ns   = inject(NotificationService);
  readonly API_URL = 'http://localhost:5001';

  activeTab = signal<ActiveTab>('tickets');
  usersSubTab = signal<UsersSubTab>('tenants');

  tickets = signal<Ticket[]>([]);
  vendors = signal<Vendor[]>([]);
  reviewTickets = signal<Ticket[]>([]);
  tenants = signal<Tenant[]>([]);
  allVendors = signal<Vendor[]>([]);

  loadingTickets = signal(true);
  loadingVendors = signal(true);
  loadingReview = signal(false);
  loadingUsers = signal(false);

  selectedTicket = signal<Ticket | null>(null);
  selectedVendor = signal<Vendor | null>(null);
  sortOrder = signal<'newest' | 'oldest'>('newest');
  previewImage = signal<string | null>(null);
  currentImageIndex = signal(0);
  _currentImages: string[] = [];

  approvingId = signal<string | null>(null);
  rejectingId = signal<string | null>(null);
  rejectReason = signal('');
  showRejectModal = signal(false);
  pendingRejectTicketId = signal<string | null>(null);

  invitePhone = signal('');
  inviteLoading = signal(false);
  inviteError = signal('');
  inviteSuccess = signal('');
  generatedLink = signal('');
  copiedLink = signal(false);
  private lastInvitedPhone = signal('');
  private router = inject(Router);

  statusFilter = signal('all');
  priorityFilter = signal('all');
  searchQuery = signal('');
  specialtyFilter = signal('all');
  usersSearchQuery = signal('');

  priorityMap: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    Low:       { label: 'منخفضة', color: '#059669', bg: '#d1fae5', dot: '#10b981' },
    Medium:    { label: 'متوسطة', color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
    High:      { label: 'عالية',  color: '#dc2626', bg: '#fee2e2', dot: '#ef4444' },
    Emergency: { label: 'طارئة',  color: '#7c3aed', bg: '#ede9fe', dot: '#8b5cf6' },
  };

  statusMap: Record<string, { label: string; color: string; bg: string }> = {
    Pending:    { label: 'انتظار',       color: '#b45309', bg: '#fef3c7' },
    Assigned:   { label: 'محدد له فني',  color: '#1d4ed8', bg: '#dbeafe' },
    InProgress: { label: 'جارٍ التنفيذ', color: '#0369a1', bg: '#e0f2fe' },
    Resolved:   { label: 'تم الحل',      color: '#059669', bg: '#d1fae5' },
    Closed:     { label: 'مغلق',         color: '#6b7280', bg: '#f3f4f6' },
    Review:     { label: 'قيد المراجعة', color: '#7c3aed', bg: '#ede9fe' },
    Rejected:   { label: 'مرفوض',        color: '#dc2626', bg: '#fee2e2' },
  };

  specialties = ['كهرباء', 'سباكة', 'تكييف', 'نجارة', 'دهانات', 'أعمال عامة'];

  firstName = computed(() => {
    const name = this.auth.currentUser()?.fullName;
    return name ? name.split(' ')[0] : 'مدير';
  });

  filteredTickets = computed(() => {
    let list = this.tickets();
    const s = this.statusFilter();
    const p = this.priorityFilter();
    if (s !== 'all') list = list.filter(t => t.status === s);
    if (p !== 'all') list = list.filter(t => t.priority === p);
    list = [...list].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return this.sortOrder() === 'newest' ? dateB - dateA : dateA - dateB;
    });
    return list;
  });

  filteredVendors = computed(() => {
    let list = this.vendors();
    const sp = this.specialtyFilter();
    const q  = this.searchQuery().trim().toLowerCase();
    if (sp !== 'all') list = list.filter(v => v.specialty === sp);
    if (q) list = list.filter(v =>
      v.fullName.toLowerCase().includes(q) ||
      v.specialty?.toLowerCase().includes(q)
    );
    return list;
  });

  filteredTenants = computed(() => {
    const q = this.usersSearchQuery().trim().toLowerCase();
    if (!q) return this.tenants();
    return this.tenants().filter(t =>
      t.fullName.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.phone?.includes(q)
    );
  });

  filteredAllVendors = computed(() => {
    const q = this.usersSearchQuery().trim().toLowerCase();
    if (!q) return this.allVendors();
    return this.allVendors().filter(v =>
      v.fullName.toLowerCase().includes(q) ||
      v.specialty?.toLowerCase().includes(q) ||
      v.phone?.includes(q)
    );
  });

  ticketStats = computed(() => {
    const t = this.tickets();
    return {
      total:      t.length,
      pending:    t.filter(x => x.status === 'Pending').length,
      inProgress: t.filter(x => x.status === 'InProgress').length,
      resolved:   t.filter(x => x.status === 'Resolved' || x.status === 'Closed').length,
      emergency:  t.filter(x => x.priority === 'Emergency').length,
    };
  });

  vendorStats = computed(() => ({ total: this.vendors().length }));
  reviewStats = computed(() => ({ total: this.reviewTickets().length }));
  usersStats  = computed(() => ({
    tenants: this.tenants().length,
    vendors: this.allVendors().length,
  }));

  constructor(public auth: Auth) {}

  ngOnInit() {
    this.loadTickets();
    this.loadVendors();
    const token = localStorage.getItem('token');
    if (token) this.ns.connect(token);
  }

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  loadTickets() {
    this.loadingTickets.set(true);
    this.http.get<Ticket[]>(`${this.API_URL}/api/Tickets`, { headers: this.headers() }).subscribe({
      next: d => { this.tickets.set(d); this.loadingTickets.set(false); },
      error: e => { console.error(e); this.loadingTickets.set(false); },
    });
  }

  loadVendors() {
    this.loadingVendors.set(true);
    this.http.get<Vendor[]>(`${this.API_URL}/api/Vendors`, { headers: this.headers() }).subscribe({
      next: d => { this.vendors.set(d); this.loadingVendors.set(false); },
      error: e => { console.error(e); this.loadingVendors.set(false); },
    });
  }

  loadReviewTickets() {
    this.loadingReview.set(true);
    this.http.get<Ticket[]>(`${this.API_URL}/api/Tickets/ManagerReview`, { headers: this.headers() }).subscribe({
      next: d => { this.reviewTickets.set(d); this.loadingReview.set(false); },
      error: e => { console.error(e); this.loadingReview.set(false); },
    });
  }

  loadUsers() {
    this.loadingUsers.set(true);
    this.http.get<Tenant[]>(`${this.API_URL}/api/Manager/tenants`, { headers: this.headers() }).subscribe({
      next: d => { this.tenants.set(d); },
      error: e => console.error(e),
    });
    this.http.get<Vendor[]>(`${this.API_URL}/api/Manager/vendors`, { headers: this.headers() }).subscribe({
      next: d => { this.allVendors.set(d); this.loadingUsers.set(false); },
      error: e => { console.error(e); this.loadingUsers.set(false); },
    });
  }

  approveTicket(ticketId: string) {
    this.approvingId.set(ticketId);
    this.http.patch(`${this.API_URL}/api/Tickets/${ticketId}/approve`, {}, { headers: this.headers() }).subscribe({
      next: () => {
        this.approvingId.set(null);
        this.loadReviewTickets(); this.loadTickets();
        if (this.selectedTicket()?.id === ticketId) this.closeTicket();
      },
      error: e => { console.error(e); this.approvingId.set(null); },
    });
  }

  openRejectModal(ticketId: string) {
    this.pendingRejectTicketId.set(ticketId);
    this.rejectReason.set('');
    this.showRejectModal.set(true);
  }

  closeRejectModal() {
    this.showRejectModal.set(false);
    this.pendingRejectTicketId.set(null);
    this.rejectReason.set('');
  }

  confirmReject() {
    const ticketId = this.pendingRejectTicketId();
    if (!ticketId) return;
    this.rejectingId.set(ticketId);
    this.http.patch(
      `${this.API_URL}/api/Tickets/${ticketId}/reject`,
      { reason: this.rejectReason() },
      { headers: this.headers() }
    ).subscribe({
      next: () => {
        this.rejectingId.set(null);
        this.closeRejectModal();
        this.loadReviewTickets(); this.loadTickets();
        if (this.selectedTicket()?.id === ticketId) this.closeTicket();
      },
      error: e => { console.error(e); this.rejectingId.set(null); },
    });
  }

  sendInvitation() {
    const phone = this.invitePhone().trim();
    if (!phone) { this.inviteError.set('من فضلك ادخل رقم الهاتف'); return; }
    this.inviteLoading.set(true);
    this.inviteError.set(''); this.inviteSuccess.set(''); this.generatedLink.set('');
    this.http.post<{ link: string }>(`${this.API_URL}/api/Invitation/create`, { phone }, { headers: this.headers() }).subscribe({
      next: res => {
        this.inviteLoading.set(false);
        this.lastInvitedPhone.set(phone);
        this.generatedLink.set(res.link);
        this.inviteSuccess.set('تم إنشاء رابط الدعوة بنجاح! انسخه وابعته على الواتس 📲');
        this.invitePhone.set('');
      },
      error: err => { this.inviteLoading.set(false); this.inviteError.set(err?.error?.message ?? 'حدث خطأ أثناء إنشاء الدعوة'); },
    });
  }

  copyLink() {
    const link = this.generatedLink();
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      this.copiedLink.set(true);
      setTimeout(() => this.copiedLink.set(false), 2000);
    });
  }

  openWhatsApp() {
    const link = this.generatedLink();
    if (!link) return;
    let phone = this.lastInvitedPhone().replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '2' + phone;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(link)}`, '_blank');
  }

  resetInvite() {
    this.generatedLink.set(''); this.inviteSuccess.set(''); this.inviteError.set('');
    this.invitePhone.set(''); this.lastInvitedPhone.set(''); this.copiedLink.set(false);
  }

  getPriority(v: string) { return this.priorityMap[v] ?? { label: v, color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' }; }
  getStatus(v: string)   { return this.statusMap[v]   ?? { label: v, color: '#6b7280', bg: '#f3f4f6' }; }

  openTicket(t: Ticket) { this.selectedTicket.set(t); this.currentImageIndex.set(0); }
  closeTicket() { this.selectedTicket.set(null); this.closeImage(); }
  openVendor(v: Vendor) {
  this.router.navigate(['/vendor-profile', v.id]);
}
  closeVendor() { this.selectedVendor.set(null); }

  switchTab(tab: ActiveTab) {
    this.activeTab.set(tab);
    this.statusFilter.set('all'); this.priorityFilter.set('all');
    this.specialtyFilter.set('all'); this.searchQuery.set('');
    this.usersSearchQuery.set('');
    if (tab === 'review') this.loadReviewTickets();
    if (tab === 'users') this.loadUsers();
  }

  switchUsersSubTab(sub: UsersSubTab) {
    this.usersSubTab.set(sub);
    this.usersSearchQuery.set('');
  }

  openImage(images: string[], index: number) {
    this._currentImages = images; this.currentImageIndex.set(index); this.previewImage.set(images[index]);
  }
  closeImage() { this.previewImage.set(null); this._currentImages = []; }

  nextImage() {
    if (!this._currentImages.length) return;
    const n = (this.currentImageIndex() + 1) % this._currentImages.length;
    this.currentImageIndex.set(n); this.previewImage.set(this._currentImages[n]);
  }

  prevImage() {
    if (!this._currentImages.length) return;
    const p = (this.currentImageIndex() - 1 + this._currentImages.length) % this._currentImages.length;
    this.currentImageIndex.set(p); this.previewImage.set(this._currentImages[p]);
  }

  @HostListener('document:keydown', ['$event'])
  handleKey(e: KeyboardEvent) {
    if (!this.previewImage()) return;
    if (e.key === 'ArrowRight') this.nextImage();
    if (e.key === 'ArrowLeft')  this.prevImage();
    if (e.key === 'Escape')     this.closeImage();
  }

  trackById(_: number, item: any) { return item.id; }
}