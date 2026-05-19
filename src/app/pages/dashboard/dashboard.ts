import { Component, signal, OnInit, computed, inject, HostListener } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from '../../services/auth';
import { PaymentModal } from '../payment-modal/payment-modal';
import { PaymentService } from '../../services/payment-service';
import { environment } from '../../../environments/environment';

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
  tenantId: string;
  vendorName?: string;
  vendorId?: string;
  companyId: string;
  beforeImageUrls: string[];
  afterImageUrls: string[];
  isPaid: boolean;
  price: number;
}
interface ScheduleItem {
  device: string;
  task: string;
  frequency: string;
  nextDue: string;
  priority: string;
}

interface TicketApplication {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorPhone: string;
  appliedAt: string;
}

interface MonthStat { label: string; count: number; }
interface ProblemStat { type: string; label: string; count: number; icon: string; color: string; bg: string; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, DecimalPipe, FormsModule, PaymentModal],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private http = inject(HttpClient);
  private paymentSvc = inject(PaymentService);
  readonly API_URL = environment.apiUrl;
  readonly Math = Math;

  // ── Active Tab ────────────────────────────────────────────
  activeTab = signal<'tickets' | 'statistics' | 'profile'>('tickets');

  // ── Tickets ───────────────────────────────────────────────
  tickets = signal<Ticket[]>([]);
  loading = signal(true);
  selectedTicket = signal<Ticket | null>(null);
  activeFilter = signal('all');
  previewImage = signal<string | null>(null);
  currentImageIndex = signal(0);
  _currentImages: string[] = [];
  // ── AI Advisor ────────────────────────────────────────────
  showAIModal = signal(false);
  aiProblemText = signal('');
  aiAdvice = signal('');
  aiLoading = signal(false);
  aiError = signal('');
  aiDone = signal(false);
  // ── Maintenance Schedule ──────────────────────────────────
  showScheduleModal = signal(false);
  scheduleStep = signal(1);
  scheduleLoading = signal(false);
  scheduleError = signal('');
  scheduleResult = signal<ScheduleItem[]>([]);

  // Form fields
  acType = signal('سبليت');
  acAge = signal(0);
  heaterAge = signal(0);
  washerAge = signal(0);
  lastMaintenance = signal('');
  devices = signal<{ name: string; age: number }[]>([{ name: '', age: 0 }]);
  newDeviceName = signal('');

  // ── Contact Admin ─────────────────────────────────────────
  showContactModal = signal(false);
  contactMessage = signal('');
  contactLoading = signal(false);
  contactSuccess = signal(false);
  contactError = signal('');

  // ── Search & Sort ─────────────────────────────────────────
  searchQuery = signal('');
  sortBy = signal<'date_desc' | 'date_asc' | 'priority'>('date_desc');
  filterProblem = signal('all');

  // ── Applications ──────────────────────────────────────────
  applications = signal<TicketApplication[]>([]);
  loadingApplications = signal(false);
  showApplicationsModal = signal(false);
  applicationsTicketId = signal<string | null>(null);
  acceptingId = signal<string | null>(null);

  // ── Feedback ──────────────────────────────────────────────
  showFeedbackModal = signal(false);
  feedbackTicketId = signal<string | null>(null);
  feedbackComment = signal('');
  feedbackVendorId = signal<string | null>(null);
  feedbackLoading = signal(false);
  feedbackError = signal('');
  feedbackSuccess = signal(false);

  // ── Close Ticket ──────────────────────────────────────────
  closingTicketId = signal<string | null>(null);

  // ── Payment ───────────────────────────────────────────────
  showPaymentModal = signal(false);
  paymentTicket = signal<Ticket | null>(null);

  // ── Closed Success Popup ──────────────────────────────────
  showClosedSuccessModal = signal(false);
  closedTicketRef = signal<Ticket | null>(null);

  // ── Profile ───────────────────────────────────────────────
  profileFullName = signal('');
  profilePhone = signal('');
  profileEmail = signal('');
  profileLoading = signal(false);
  profileSuccess = signal(false);
  profileError = signal('');
  showCurrentPw = signal(false);
  showNewPw = signal(false);
  showConfirmPw = signal(false);
  currentPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  passwordLoading = signal(false);
  passwordSuccess = signal(false);
  passwordError = signal('');
  profileSubTab = signal<'info' | 'password'>('info');

  // ── Maps ──────────────────────────────────────────────────
  priorityMap: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    Low: { label: 'منخفضة', color: '#15803d', bg: '#dcfce7', dot: '#22c55e' },
    Medium: { label: 'متوسطة', color: '#b45309', bg: '#fef9c3', dot: '#eab308' },
    High: { label: 'عالية', color: '#b91c1c', bg: '#fee2e2', dot: '#ef4444' },
    Critical: { label: 'حرجة', color: '#6d28d9', bg: '#ede9fe', dot: '#8b5cf6' },
    Emergency: { label: 'طارئة', color: '#9a3412', bg: '#ffedd5', dot: '#f97316' },
  };

  statusMap: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    ManagerReview: { label: 'قيد مراجعة الادارة', color: '#7c3aed', bg: '#ede9fe', icon: '🔍' },
    Review: { label: 'قيد مراجعة الادارة', color: '#7c3aed', bg: '#ede9fe', icon: '🔍' },
    Rejected: { label: 'مرفوض من الادارة', color: '#dc2626', bg: '#fee2e2', icon: '❌' },
    Pending: { label: 'قيد الانتظار', color: '#b45309', bg: '#fef9c3', icon: '⏳' },
    vendorAccepted: { label: 'جارٍ التنفيذ', color: '#1d4ed8', bg: '#dbeafe', icon: '🔧' },
    Resolved: { label: 'تم الإنجاز', color: '#15803d', bg: '#dcfce7', icon: '✅' },
    Closed: { label: 'مغلق', color: '#4b5563', bg: '#f3f4f6', icon: '🔒' },
  };

  problemIconMap: Record<string, string> = {
    Electrical: 'electrical_services',
    Plumbing: 'plumbing',
    AC: 'ac_unit',
    Other: 'build',
  };

  // ── Computed: Stats ───────────────────────────────────────
  stats = computed(() => {
    const t = this.tickets();
    return {
      total: t.length,
      review: t.filter(x => x.status === 'Review' || x.status === 'ManagerReview').length,
      rejected: t.filter(x => x.status === 'Rejected').length,
      pending: t.filter(x => x.status === 'Pending').length,
      inProgress: t.filter(x => x.status === 'vendorAccepted').length,
      done: t.filter(x => x.status === 'Resolved' || x.status === 'Closed').length,
      awaitingPayment: t.filter(x => x.status === 'Resolved' && !x.isPaid && x.price > 0).length,
    };
  });

  // ── Computed: Filtered Tickets ────────────────────────────
  filteredTickets = computed(() => {
    const f = this.activeFilter();
    const q = this.searchQuery().trim().toLowerCase();
    const prob = this.filterProblem();
    const sort = this.sortBy();
    const priorityOrder: Record<string, number> = {
      Emergency: 5, Critical: 4, High: 3, Medium: 2, Low: 1,
    };

    let list = this.tickets();
    if (f !== 'all') list = list.filter(t => t.status === f);
    if (prob !== 'all') list = list.filter(t => t.problemType === prob);
    if (q) {
      list = list.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.city?.toLowerCase().includes(q) ||
        t.governorate?.toLowerCase().includes(q) ||
        t.vendorName?.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sort === 'date_desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === 'date_asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === 'priority') return (priorityOrder[b.priority] ?? 0) - (priorityOrder[a.priority] ?? 0);
      return 0;
    });
  });

  // ── Computed: Statistics ──────────────────────────────────
  statsSummary = computed(() => {
    const t = this.tickets();
    const totalPaid = t.filter(x => x.isPaid).reduce((s, x) => s + (x.price || 0), 0);
    return {
      total: t.length,
      closed: t.filter(x => x.status === 'Closed').length,
      inProgress: t.filter(x => x.status === 'vendorAccepted').length,
      pending: t.filter(x => x.status === 'Pending').length,
      totalPaid,
      closedPct: t.length ? Math.round((t.filter(x => x.status === 'Closed').length / t.length) * 100) : 0,
    };
  });

  monthlyStats = computed((): MonthStat[] => {
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const map: Record<string, number> = {};
    this.tickets().forEach(t => {
      const d = new Date(t.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      map[key] = (map[key] || 0) + 1;
    });
    const result: MonthStat[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({ label: monthNames[d.getMonth()], count: map[`${d.getFullYear()}-${d.getMonth()}`] || 0 });
    }
    return result;
  });

  maxMonthCount = computed(() => Math.max(...this.monthlyStats().map(m => m.count), 1));

  problemStats = computed((): ProblemStat[] => {
    const map: Record<string, number> = {};
    this.tickets().forEach(t => { map[t.problemType] = (map[t.problemType] || 0) + 1; });
    const config: Record<string, { label: string; icon: string; color: string; bg: string }> = {
      Electrical: { label: 'كهرباء', icon: 'electrical_services', color: '#b45309', bg: '#fef9c3' },
      Plumbing: { label: 'سباكة', icon: 'plumbing', color: '#1d4ed8', bg: '#dbeafe' },
      AC: { label: 'تكييف', icon: 'ac_unit', color: '#0f766e', bg: '#ccfbf1' },
      Other: { label: 'أخرى', icon: 'build', color: '#6b7280', bg: '#f3f4f6' },
    };
    return Object.entries(map).map(([type, count]) => ({
      type, count,
      label: config[type]?.label ?? type,
      icon: config[type]?.icon ?? 'build',
      color: config[type]?.color ?? '#6b7280',
      bg: config[type]?.bg ?? '#f3f4f6',
    })).sort((a, b) => b.count - a.count);
  });

  maxProblemCount = computed(() => Math.max(...this.problemStats().map(p => p.count), 1));

  statusDist = computed(() => {
    const t = this.tickets();
    if (!t.length) return [];
    const groups = [
      { label: 'مراجعة', statuses: ['Review', 'ManagerReview'], color: '#7c3aed', bg: '#ede9fe' },
      { label: 'انتظار', statuses: ['Pending'], color: '#b45309', bg: '#fef9c3' },
      { label: 'تنفيذ', statuses: ['vendorAccepted'], color: '#1d4ed8', bg: '#dbeafe' },
      { label: 'مكتمل', statuses: ['Resolved', 'Closed'], color: '#15803d', bg: '#dcfce7' },
      { label: 'مرفوض', statuses: ['Rejected'], color: '#dc2626', bg: '#fee2e2' },
    ];
    return groups.map(g => ({
      ...g,
      count: t.filter(x => g.statuses.includes(x.status)).length,
      pct: Math.round((t.filter(x => g.statuses.includes(x.status)).length / t.length) * 100),
    })).filter(g => g.count > 0);
  });

  priorityDist = computed(() => {
    const t = this.tickets();
    const config: Record<string, { label: string; color: string; bg: string }> = {
      Low: { label: 'منخفضة', color: '#15803d', bg: '#dcfce7' },
      Medium: { label: 'متوسطة', color: '#b45309', bg: '#fef9c3' },
      High: { label: 'عالية', color: '#b91c1c', bg: '#fee2e2' },
      Critical: { label: 'حرجة', color: '#6d28d9', bg: '#ede9fe' },
      Emergency: { label: 'طارئة', color: '#9a3412', bg: '#ffedd5' },
    };
    const map: Record<string, number> = {};
    t.forEach(x => { map[x.priority] = (map[x.priority] || 0) + 1; });
    return Object.entries(map).map(([p, count]) => ({
      label: config[p]?.label ?? p,
      color: config[p]?.color ?? '#4b5563',
      bg: config[p]?.bg ?? '#f3f4f6',
      count,
      pct: Math.round((count / t.length) * 100),
    })).sort((a, b) => b.count - a.count);
  });

  // ── Computed: Profile ─────────────────────────────────────
  firstName = computed(() => {
    const name = this.auth.currentUser()?.fullName;
    return name ? name.split(' ')[0] : 'مستخدم';
  });

  get profileInitials(): string {
    const name = this.profileFullName() || this.auth.currentUser()?.fullName || '';
    return name.split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  }

  profileCompleteness = computed(() => {
    let score = 0;
    if (this.profileFullName()?.trim()) score += 34;
    if (this.profileEmail()?.trim()) score += 33;
    if (this.profilePhone()?.trim()) score += 33;
    return score;
  });

  // ── Methods: Password Strength ────────────────────────────
  passwordStrengthPct(): number {
    const pw = this.newPassword();
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 6) score += 25;
    if (pw.length >= 10) score += 25;
    if (/[A-Z]/.test(pw)) score += 25;
    if (/[0-9!@#$%^&*]/.test(pw)) score += 25;
    return score;
  }

  passwordStrengthColor(): string {
    const pct = this.passwordStrengthPct();
    if (pct <= 25) return '#ef4444';
    if (pct <= 50) return '#f97316';
    if (pct <= 75) return '#eab308';
    return '#22c55e';
  }

  passwordStrengthLabel(): string {
    const pct = this.passwordStrengthPct();
    if (pct <= 25) return 'كلمة سر ضعيفة جداً';
    if (pct <= 50) return 'كلمة سر ضعيفة';
    if (pct <= 75) return 'كلمة سر متوسطة';
    return 'كلمة سر قوية ✓';
  }

  // ── Methods: Statistics helpers ───────────────────────────
  barHeightPct(count: number): number {
    return Math.max((count / this.maxMonthCount()) * 100, 4);
  }

  problemPct(count: number): number {
    return this.tickets().length ? Math.round((count / this.tickets().length) * 100) : 0;
  }

  problemBarPct(count: number): number {
    return Math.round((count / this.maxProblemCount()) * 100);
  }

  getPaidRingOffset(): number {
    const total = this.tickets().length;
    const paid = this.tickets().filter(t => t.isPaid).length;
    if (!total) return 314;
    return 314 - (314 * paid / total);
  }
  // ── Methods: AI Advisor ───────────────────────────────────
  openAIModal() {
    this.aiProblemText.set('');
    this.aiAdvice.set('');
    this.aiError.set('');
    this.aiDone.set(false);
    this.showAIModal.set(true);
  }

  closeAIModal() { this.showAIModal.set(false); }

  askAI() {
    const text = this.aiProblemText().trim();
    if (!text) { this.aiError.set('اكتب وصف المشكلة أولاً'); return; }
    this.aiLoading.set(true);
    this.aiError.set('');
    this.aiAdvice.set('');
    this.aiDone.set(false);
    this.http.post<{ advice: string }>(
      `${this.API_URL}/api/AI/maintenance-advice`,
      { problem: text },
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        this.aiLoading.set(false);
        this.aiAdvice.set(res.advice);
        this.aiDone.set(true);
      },
      error: (err) => {
        this.aiLoading.set(false);
        this.aiError.set(err?.error?.message ?? 'حصل خطأ، حاول تاني');
      }
    });
  }
  // ── Methods: Maintenance Schedule ────────────────────────
  openScheduleModal() {
    this.scheduleStep.set(1);
    this.scheduleResult.set([]);
    this.scheduleError.set('');
    this.acType.set('سبليت');
    this.acAge.set(0);
    this.heaterAge.set(0);
    this.washerAge.set(0);
    this.lastMaintenance.set('');
    this.showScheduleModal.set(true);
  }

  closeScheduleModal() { this.showScheduleModal.set(false); }

  addDevice() {
    this.devices.update(d => [...d, { name: '', age: 0 }]);
  }

  removeDevice(index: number) {
    this.devices.update(d => d.filter((_, i) => i !== index));
  }

  updateDeviceName(index: number, name: string) {
    this.devices.update(d => d.map((item, i) => i === index ? { ...item, name } : item));
  }

  updateDeviceAge(index: number, age: number) {
    this.devices.update(d => d.map((item, i) => i === index ? { ...item, age: Math.max(0, age) } : item));
  }

  generateSchedule() {
    const validDevices = this.devices().filter(d => d.name.trim());
    if (!validDevices.length) {
      this.scheduleError.set('أضف جهازاً واحداً على الأقل');
      return;
    }
    this.scheduleLoading.set(true);
    this.scheduleError.set('');
    this.http.post<{ schedule: ScheduleItem[] }>(
      `${this.API_URL}/api/AI/maintenance-schedule`,
      {
        devices: validDevices.map(d => ({ deviceName: d.name, ageYears: d.age })),
        lastMaintenanceDate: this.lastMaintenance() || 'غير محدد'
      },
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        this.scheduleLoading.set(false);
        this.scheduleResult.set(res.schedule);
        this.scheduleStep.set(2);
      },
      error: (err) => {
        this.scheduleLoading.set(false);
        this.scheduleError.set(err?.error?.message ?? 'حدث خطأ، يرجى المحاولة مجدداً');
      }
    });
  }

  getPriorityConfig(priority: string): { label: string; color: string; bg: string } {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      High: { label: 'عاجل', color: '#b91c1c', bg: '#fee2e2' },
      Medium: { label: 'متوسط', color: '#b45309', bg: '#fef9c3' },
      Low: { label: 'منخفض', color: '#15803d', bg: '#dcfce7' },
    };
    return map[priority] ?? { label: priority, color: '#4b5563', bg: '#f3f4f6' };
  }

  // ── Methods: Contact Admin ────────────────────────────────
  openContactModal() {
    this.contactMessage.set('');
    this.contactSuccess.set(false);
    this.contactError.set('');
    this.showContactModal.set(true);
  }

  closeContactModal() { this.showContactModal.set(false); }

  sendContactMessage() {
    const msg = this.contactMessage().trim();
    if (!msg) { this.contactError.set('اكتب رسالتك أولاً'); return; }
    this.contactLoading.set(true);
    this.contactError.set('');
    this.http.post(
      `${this.API_URL}/api/Contact/send`,
      { message: msg },
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.contactLoading.set(false);
        this.contactSuccess.set(true);
        this.contactMessage.set('');
        setTimeout(() => this.closeContactModal(), 2500);
      },
      error: (err) => {
        this.contactLoading.set(false);
        this.contactError.set(err?.error?.message ?? 'حصل خطأ، حاول تاني');
      }
    });
  }

  // ── Constructor ───────────────────────────────────────────
  constructor(public auth: Auth, private router: Router) { }

  ngOnInit() {
    const user = this.auth.currentUser();
    if (user) {
      this.profileFullName.set(user.fullName ?? '');
      this.profileEmail.set(user.email ?? '');
      this.profilePhone.set((user as any).phoneNumber ?? '');
    }

    const paymentId = localStorage.getItem('payment_just_done');
    const ticketId = localStorage.getItem('payment_done_ticket');
    if (paymentId) {
      localStorage.removeItem('payment_just_done');
      localStorage.removeItem('payment_done_ticket');
      this.paymentSvc.verifyPayment(paymentId).subscribe({
        next: () => this.loadTicketsAndOpenIfPaid(ticketId ?? null),
        error: () => this.loadTicketsAndOpenIfPaid(ticketId ?? null),
      });
    } else {
      this.loadTickets();
    }
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ── Methods: Tickets ──────────────────────────────────────
  loadTickets() {
    this.loading.set(true);
    this.http.get<Ticket[]>(`${this.API_URL}/api/Tickets`, { headers: this.getHeaders() }).subscribe({
      next: (data) => { this.tickets.set(data); this.loading.set(false); },
      error: (err) => { console.error(err); this.loading.set(false); },
    });
  }

  private loadTicketsAndOpenIfPaid(ticketId: string | null) {
    this.loading.set(true);
    this.http.get<Ticket[]>(`${this.API_URL}/api/Tickets`, { headers: this.getHeaders() }).subscribe({
      next: (data) => {
        this.tickets.set(data);
        this.loading.set(false);
        if (ticketId) { const t = data.find(x => x.id === ticketId); if (t) this.openTicket(t); }
      },
      error: () => this.loading.set(false),
    });
  }

  openTicket(t: Ticket) { this.selectedTicket.set(t); this.currentImageIndex.set(0); }
  closeTicket() { this.selectedTicket.set(null); this.closeImage(); }

  needsPayment(ticket: Ticket): boolean {
    return ticket.status === 'Resolved' && !ticket.isPaid && ticket.price > 0;
  }

  // ── Methods: Profile ──────────────────────────────────────
  updateProfile() {
    if (!this.profileFullName().trim()) { this.profileError.set('الاسم مطلوب'); return; }
    this.profileLoading.set(true);
    this.profileError.set('');
    this.profileSuccess.set(false);
    this.http.put(
      `${this.API_URL}/api/Account/profile`,
      { fullName: this.profileFullName(), phoneNumber: this.profilePhone() },
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => { this.profileLoading.set(false); this.profileSuccess.set(true); setTimeout(() => this.profileSuccess.set(false), 3000); },
      error: (err) => { this.profileLoading.set(false); this.profileError.set(err?.error?.message ?? 'حصل خطأ، حاول تاني'); },
    });
  }

  changePassword() {
    if (!this.currentPassword()) { this.passwordError.set('ادخل كلمة السر الحالية'); return; }
    if (this.newPassword().length < 6) { this.passwordError.set('كلمة السر الجديدة 6 أحرف على الأقل'); return; }
    if (this.newPassword() !== this.confirmPassword()) { this.passwordError.set('كلمتا السر مش متطابقتين'); return; }
    this.passwordLoading.set(true);
    this.passwordError.set('');
    this.passwordSuccess.set(false);
    this.http.post(
      `${this.API_URL}/api/Account/change-password`,
      { currentPassword: this.currentPassword(), newPassword: this.newPassword(), confirmPassword: this.confirmPassword() },
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.passwordLoading.set(false);
        this.passwordSuccess.set(true);
        this.currentPassword.set(''); this.newPassword.set(''); this.confirmPassword.set('');
        setTimeout(() => this.passwordSuccess.set(false), 3000);
      },
      error: (err) => { this.passwordLoading.set(false); this.passwordError.set(err?.error?.message ?? 'حصل خطأ، حاول تاني'); },
    });
  }

  // ── Methods: Payment ──────────────────────────────────────
  openPayment(ticket: Ticket, event: Event) { event.stopPropagation(); this.paymentTicket.set(ticket); this.showPaymentModal.set(true); }
  onPaymentClosed() { this.showPaymentModal.set(false); this.paymentTicket.set(null); }
  onPaymentDone() {
    this.showPaymentModal.set(false);
    const id = this.paymentTicket()?.id ?? this.selectedTicket()?.id;
    this.paymentTicket.set(null); this.selectedTicket.set(null);
    this.loading.set(true);
    this.http.get<Ticket[]>(`${this.API_URL}/api/Tickets`, { headers: this.getHeaders() }).subscribe({
      next: (data) => {
        this.tickets.set(data); this.loading.set(false);
        if (id) { const t = data.find(x => x.id === id); if (t) this.openTicket(t); }
      },
      error: () => this.loading.set(false),
    });
  }

  // ── Methods: Applications ─────────────────────────────────
  openApplications(ticket: Ticket, event: Event) {
    event.stopPropagation();
    this.applicationsTicketId.set(ticket.id);
    this.showApplicationsModal.set(true);
    this.loadApplications(ticket.id);
  }

  loadApplications(ticketId: string) {
    this.loadingApplications.set(true);
    this.applications.set([]);
    this.http.get<TicketApplication[]>(`${this.API_URL}/api/TicketApplication/${ticketId}`, { headers: this.getHeaders() }).subscribe({
      next: (data) => { this.applications.set(data); this.loadingApplications.set(false); },
      error: (err) => { console.error(err); this.loadingApplications.set(false); },
    });
  }

  acceptApplication(applicationId: string) {
    this.acceptingId.set(applicationId);
    this.http.patch(`${this.API_URL}/api/Tickets/${applicationId}/accept`, {}, { headers: this.getHeaders() }).subscribe({
      next: () => { this.acceptingId.set(null); this.showApplicationsModal.set(false); this.loadTickets(); },
      error: (err) => { console.error(err); this.acceptingId.set(null); },
    });
  }

  closeApplicationsModal() { this.showApplicationsModal.set(false); this.applications.set([]); }

  // ── Methods: Feedback ─────────────────────────────────────
  openFeedback(ticket: Ticket, event: Event) {
    event.stopPropagation();
    this.feedbackTicketId.set(ticket.id);
    this.feedbackVendorId.set(ticket.vendorId ?? null);
    this.feedbackComment.set(''); this.feedbackError.set(''); this.feedbackSuccess.set(false);
    this.showFeedbackModal.set(true);
  }

  submitFeedback() {
    const comment = this.feedbackComment().trim();
    if (!comment) { this.feedbackError.set('اكتب تعليق الأول'); return; }
    if (!this.feedbackVendorId()) { this.feedbackError.set('لا يوجد فني مرتبط بهذا الطلب'); return; }
    this.feedbackLoading.set(true); this.feedbackError.set('');
    this.http.post(
      `${this.API_URL}/api/Feedbacks`,
      { comment, ticketId: this.feedbackTicketId(), vendorId: this.feedbackVendorId() },
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => { this.feedbackLoading.set(false); this.feedbackSuccess.set(true); setTimeout(() => this.closeFeedbackModal(), 1800); },
      error: (err) => { this.feedbackLoading.set(false); this.feedbackError.set(err?.error?.message ?? 'حصل خطأ، حاول تاني'); },
    });
  }

  closeFeedbackModal() { this.showFeedbackModal.set(false); this.feedbackComment.set(''); this.feedbackSuccess.set(false); this.feedbackError.set(''); }

  // ── Methods: Close Ticket ─────────────────────────────────
  closeTicketAction(ticketId: string, event: Event) {
    event.stopPropagation();
    this.closingTicketId.set(ticketId);
    // احتفظ بمرجع التذكرة قبل الإغلاق لعرضها في الـ popup
    const ticketSnapshot = this.selectedTicket() ?? this.tickets().find(t => t.id === ticketId) ?? null;
    this.http.patch(`${this.API_URL}/api/Tickets/${ticketId}/close`, {}, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.closingTicketId.set(null);
        this.closeTicket();
        this.loadTickets();
        // أظهر الـ success popup مع بيانات التذكرة
        if (ticketSnapshot) this.closedTicketRef.set(ticketSnapshot);
        this.showClosedSuccessModal.set(true);
      },
      error: (err) => { console.error(err); this.closingTicketId.set(null); },
    });
  }

  // ── Methods: Closed Success Popup ─────────────────────────
  dismissClosedModal() {
    this.showClosedSuccessModal.set(false);
    this.closedTicketRef.set(null);
  }

  openFeedbackFromClosed() {
    const t = this.closedTicketRef();
    if (!t) return;
    this.dismissClosedModal();
    this.feedbackTicketId.set(t.id);
    this.feedbackVendorId.set(t.vendorId ?? null);
    this.feedbackComment.set('');
    this.feedbackError.set('');
    this.feedbackSuccess.set(false);
    this.showFeedbackModal.set(true);
  }

  // ── Methods: Vendor ───────────────────────────────────────
  openVendorProfile(vendorId: string, event: Event) { event.stopPropagation(); this.router.navigate(['/vendor-profile', vendorId]); }

  // ── Methods: Images ───────────────────────────────────────
  openImage(images: string[], index: number) { this._currentImages = images; this.currentImageIndex.set(index); this.previewImage.set(images[index]); }
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

  // ── Methods: Helpers ──────────────────────────────────────
  getPriority(v: string) { return this.priorityMap[v] ?? { label: v, color: '#4b5563', bg: '#f3f4f6', dot: '#9ca3af' }; }
  getStatus(v: string) { return this.statusMap[v] ?? { label: v, color: '#4b5563', bg: '#f3f4f6', icon: '•' }; }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    if (this.showClosedSuccessModal()) {
      if (event.key === 'Escape') this.dismissClosedModal();
      return;
    }
    if (!this.previewImage()) return;
    switch (event.key) {
      case 'ArrowRight': this.nextImage(); break;
      case 'ArrowLeft': this.prevImage(); break;
      case 'Escape': this.closeImage(); break;
    }
  }
}
