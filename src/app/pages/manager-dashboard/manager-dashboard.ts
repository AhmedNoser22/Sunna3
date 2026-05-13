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
  governorate?: string;
  city?: string;
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
  isPaid: boolean;
  price: number;
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
}

interface VendorPayout {
  paymentId: string;
  ticketId: string;
  vendorId: string;
  vendorName: string;
  vendorIBAN?: string;
  vendorInstapay?: string;
  vendorWallet?: string;
  vendorAmount: number;
  platformAmount: number;
  totalAmount: number;
  paymentMethod: string;
  paidAt: string;
  isDisbursed: boolean;
  disbursedAt?: string;
}

type ActiveTab = 'tickets' | 'vendors' | 'invitations' | 'review' | 'users' | 'payouts';
type UsersSubTab = 'tenants' | 'vendors';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, NotificationBell],
  templateUrl: './manager-dashboard.html',
  styleUrl: './manager-dashboard.scss',
})
export class ManagerDashboard implements OnInit {
  private http = inject(HttpClient);
  private ns = inject(NotificationService);
  readonly API_URL = 'http://localhost:5001';

  activeTab = signal<ActiveTab>('tickets');
  usersSubTab = signal<UsersSubTab>('tenants');
  payoutsSubTab = signal<'pending' | 'all'>('pending');

  // في الـ signals section
  copiedField = signal<string | null>(null);
  activeMethodMap = signal<Record<string, string>>({});

  tickets = signal<Ticket[]>([]);
  vendors = signal<Vendor[]>([]);
  reviewTickets = signal<Ticket[]>([]);
  tenants = signal<Tenant[]>([]);
  allVendors = signal<Vendor[]>([]);
  payouts = signal<VendorPayout[]>([]);
  pendingPayouts = signal<VendorPayout[]>([]);

  loadingTickets = signal(true);
  loadingVendors = signal(true);
  loadingReview = signal(false);
  loadingUsers = signal(false);
  loadingPayouts = signal(false);
  confirmingId = signal<string | null>(null);

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
    Low: { label: 'منخفضة', color: '#059669', bg: '#d1fae5', dot: '#10b981' },
    '0': { label: 'منخفضة', color: '#059669', bg: '#d1fae5', dot: '#10b981' },
    Medium: { label: 'متوسطة', color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
    '1': { label: 'متوسطة', color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
    High: { label: 'عالية', color: '#dc2626', bg: '#fee2e2', dot: '#ef4444' },
    '2': { label: 'عالية', color: '#dc2626', bg: '#fee2e2', dot: '#ef4444' },
    Emergency: { label: 'طارئة', color: '#7c3aed', bg: '#ede9fe', dot: '#8b5cf6' },
    '3': { label: 'طارئة', color: '#7c3aed', bg: '#ede9fe', dot: '#8b5cf6' },
  };

  statusMap: Record<string, { label: string; color: string; bg: string }> = {
    ManagerReview: { label: 'قيد المراجعة', color: '#7c3aed', bg: '#ede9fe' },
    '4': { label: 'قيد المراجعة', color: '#7c3aed', bg: '#ede9fe' },
    Pending: { label: 'انتظار', color: '#b45309', bg: '#fef3c7' },
    '0': { label: 'انتظار', color: '#b45309', bg: '#fef3c7' },
    vendorAccepted: { label: 'جارٍ التنفيذ', color: '#0369a1', bg: '#e0f2fe' },
    '1': { label: 'جارٍ التنفيذ', color: '#0369a1', bg: '#e0f2fe' },
    Resolved: { label: 'تم الإنجاز', color: '#059669', bg: '#d1fae5' },
    '2': { label: 'تم الإنجاز', color: '#059669', bg: '#d1fae5' },
    Closed: { label: 'مغلق', color: '#6b7280', bg: '#f3f4f6' },
    '3': { label: 'مغلق', color: '#6b7280', bg: '#f3f4f6' },
    Rejected: { label: 'مرفوض', color: '#dc2626', bg: '#fee2e2' },
    '5': { label: 'مرفوض', color: '#dc2626', bg: '#fee2e2' },
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
    return [...list].sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return this.sortOrder() === 'newest' ? db - da : da - db;
    });
  });

  filteredVendors = computed(() => {
    let list = this.vendors();
    const sp = this.specialtyFilter();
    const q = this.searchQuery().trim().toLowerCase();
    if (sp !== 'all') list = list.filter(v => v.specialty === sp);
    if (q) list = list.filter(v => v.fullName.toLowerCase().includes(q) || v.specialty?.toLowerCase().includes(q));
    return list;
  });

  filteredTenants = computed(() => {
    const q = this.usersSearchQuery().trim().toLowerCase();
    if (!q) return this.tenants();
    return this.tenants().filter(t =>
      t.fullName.toLowerCase().includes(q) || t.email.toLowerCase().includes(q) || t.phone?.includes(q)
    );
  });

  filteredAllVendors = computed(() => {
    const q = this.usersSearchQuery().trim().toLowerCase();
    if (!q) return this.allVendors();
    return this.allVendors().filter(v =>
      v.fullName.toLowerCase().includes(q) || v.specialty?.toLowerCase().includes(q) || v.phone?.includes(q)
    );
  });

  // الـ payouts اللي تظهر حسب الـ sub-tab
  displayedPayouts = computed(() =>
    this.payoutsSubTab() === 'pending' ? this.pendingPayouts() : this.payouts()
  );

  ticketStats = computed(() => {
    const t = this.tickets();
    return {
      total: t.length,
      pending: t.filter(x => x.status === 'Pending' || x.status === '0').length,
      inProgress: t.filter(x => x.status === 'vendorAccepted' || x.status === '1').length,
      resolved: t.filter(x => x.status === 'Resolved' || x.status === '2').length,
      closed: t.filter(x => x.status === 'Closed' || x.status === '3').length,
      emergency: t.filter(x => x.priority === 'Emergency' || x.priority === '3').length,
    };
  });


  payoutsStats = computed(() => ({
    pending: this.pendingPayouts().length,
    total: this.payouts().length,
    pendingAmount: this.pendingPayouts().reduce((s, p) => s + p.vendorAmount, 0),
    totalPlatform: this.payouts().reduce((s, p) => s + p.platformAmount, 0),
  }));

  vendorStats = computed(() => ({ total: this.vendors().length }));
  reviewStats = computed(() => ({ total: this.reviewTickets().length }));
  usersStats = computed(() => ({ tenants: this.tenants().length, vendors: this.allVendors().length }));

  constructor(public auth: Auth) { }

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

  getPaymentMethods(p: VendorPayout): { key: string; label: string; icon: string; value: string }[] {
    const methods = [];
    if (p.vendorIBAN) methods.push({ key: 'iban', label: 'تحويل بنكي (IBAN)', icon: 'account_balance', value: p.vendorIBAN });
    if (p.vendorInstapay) methods.push({ key: 'instapay', label: 'InstaPay', icon: 'send_to_mobile', value: p.vendorInstapay });
    if (p.vendorWallet) methods.push({ key: 'wallet', label: 'محفظة إلكترونية', icon: 'phone_iphone', value: p.vendorWallet });
    return methods;
  }

  getActiveMethod(paymentId: string): string {
    const map = this.activeMethodMap();
    if (map[paymentId]) return map[paymentId];
    // default: أول طريقة متاحة
    const payout = [...this.payouts(), ...this.pendingPayouts()].find(p => p.paymentId === paymentId);
    if (!payout) return 'iban';
    if (payout.vendorIBAN) return 'iban';
    if (payout.vendorInstapay) return 'instapay';
    return 'wallet';
  }

  setActiveMethod(paymentId: string, key: string) {
    this.activeMethodMap.update(map => ({ ...map, [paymentId]: key }));
  }

  copyPaymentInfo(value: string, fieldKey: string) {
    navigator.clipboard.writeText(value).then(() => {
      this.copiedField.set(fieldKey);
      setTimeout(() => this.copiedField.set(null), 2000);
    });
  }

  // ── Payouts ───────────────────────────────────────────────
  loadPayouts() {
    this.loadingPayouts.set(true);
    // كل الـ payouts
    this.http.get<VendorPayout[]>(`${this.API_URL}/api/Manager/payouts`, { headers: this.headers() }).subscribe({
      next: d => { this.payouts.set(d); this.loadingPayouts.set(false); },
      error: e => { console.error(e); this.loadingPayouts.set(false); },
    });
    // الـ pending فقط
    this.http.get<VendorPayout[]>(`${this.API_URL}/api/Manager/payouts/pending`, { headers: this.headers() }).subscribe({
      next: d => this.pendingPayouts.set(d),
      error: e => console.error(e),
    });
  }

  confirmPayout(paymentId: string) {
    this.confirmingId.set(paymentId);
    this.http.patch(`${this.API_URL}/api/Manager/payouts/${paymentId}/confirm`, {}, { headers: this.headers() }).subscribe({
      next: () => {
        this.confirmingId.set(null);
        this.loadPayouts(); // reload
      },
      error: e => { console.error(e); this.confirmingId.set(null); },
    });
  }

  getPaymentMethodLabel(method: string): string {
    const map: Record<string, string> = {
      card: 'بطاقة بنكية',
      wallet: 'محفظة إلكترونية',
    };
    return map[method] ?? method;
  }

  getPaymentMethodIcon(method: string): string {
    return method === 'card' ? 'credit_card' : 'phone_iphone';
  }

  // ── Review ────────────────────────────────────────────────
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

  // ── Invitation ────────────────────────────────────────────
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

  // ── Navigation ────────────────────────────────────────────
  getPriority(v: string) { return this.priorityMap[v] ?? { label: v, color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' }; }
  getStatus(v: string) { return this.statusMap[v] ?? { label: v, color: '#6b7280', bg: '#f3f4f6' }; }

  openTicket(t: Ticket) { this.selectedTicket.set(t); this.currentImageIndex.set(0); }
  closeTicket() { this.selectedTicket.set(null); this.closeImage(); }
  openVendor(v: Vendor) { this.router.navigate(['/vendor-profile', v.id]); }

  switchTab(tab: ActiveTab) {
    this.activeTab.set(tab);
    this.statusFilter.set('all'); this.priorityFilter.set('all');
    this.specialtyFilter.set('all'); this.searchQuery.set('');
    this.usersSearchQuery.set('');
    if (tab === 'review') this.loadReviewTickets();
    if (tab === 'users') this.loadUsers();
    if (tab === 'payouts') this.loadPayouts();
  }

  switchUsersSubTab(sub: UsersSubTab) { this.usersSubTab.set(sub); this.usersSearchQuery.set(''); }

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
    if (e.key === 'ArrowLeft') this.prevImage();
    if (e.key === 'Escape') this.closeImage();
  }

  trackById(_: number, item: any) { return item.id ?? item.paymentId; }
}