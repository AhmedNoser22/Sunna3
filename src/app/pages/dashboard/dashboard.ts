import { Component, signal, OnInit, computed, inject, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from '../../services/auth';
import { NotificationBell } from '../notification-bell/notification-bell';
import { NotificationService } from '../../services/notification-service';
import { PaymentModal } from '../payment-modal/payment-modal';
import { PaymentService } from '../../services/payment-service';

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

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  ticketId?: string;
}

interface TicketApplication {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorPhone: string;
  appliedAt: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, FormsModule, NotificationBell, PaymentModal],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private http = inject(HttpClient);
  private ns = inject(NotificationService);
  private paymentSvc = inject(PaymentService);
  readonly API_URL = 'http://localhost:5001';

  tickets = signal<Ticket[]>([]);
  loading = signal(true);
  selectedTicket = signal<Ticket | null>(null);
  activeFilter = signal('all');
  previewImage = signal<string | null>(null);
  currentImageIndex = signal(0);
  _currentImages: string[] = [];

  notifications = signal<Notification[]>([]);
  showNotifications = signal(false);
  unreadCount = computed(() => this.notifications().filter(n => !n.isRead).length);

  applications = signal<TicketApplication[]>([]);
  loadingApplications = signal(false);
  showApplicationsModal = signal(false);
  applicationsTicketId = signal<string | null>(null);
  acceptingId = signal<string | null>(null);

  showFeedbackModal = signal(false);
  feedbackTicketId = signal<string | null>(null);
  feedbackComment = signal('');
  feedbackVendorId = signal<string | null>(null);
  feedbackLoading = signal(false);
  feedbackError = signal('');
  feedbackSuccess = signal(false);

  closingTicketId = signal<string | null>(null);

  // ── Payment ──────────────────────────────────────────────
  showPaymentModal = signal(false);
  paymentTicket = signal<Ticket | null>(null);

  firstName = computed(() => {
    const name = this.auth.currentUser()?.fullName;
    return name ? name.split(' ')[0] : 'مستخدم';
  });

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

  problemIconMap: Record<string, string> = {
    Electrical: 'electrical_services',
    Plumbing: 'plumbing',
    AC: 'ac_unit',
    Other: 'build',
  };

  filteredTickets = computed(() => {
    const f = this.activeFilter();
    return f === 'all' ? this.tickets() : this.tickets().filter(t => t.status === f);
  });

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

  constructor(public auth: Auth, private router: Router) { }

  ngOnInit() {
    this.loadNotifications();
    const token = localStorage.getItem('token');
    if (token) this.ns.connect(token);

    const paymentId = localStorage.getItem('payment_just_done');
    const ticketId = localStorage.getItem('payment_done_ticket');

    if (paymentId) {
      localStorage.removeItem('payment_just_done');
      localStorage.removeItem('payment_done_ticket');

      this.paymentSvc.verifyPayment(paymentId).subscribe({
        next: (res) => {
          this.loadTicketsAndOpenIfPaid(ticketId ?? null);
        },
        error: () => {
          this.loadTicketsAndOpenIfPaid(ticketId ?? null);
        }
      });
    } else {
      this.loadTickets();
    }
  }

  private loadTicketsAndOpenIfPaid(ticketId: string | null) {
    this.loading.set(true);
    this.http.get<Ticket[]>(`${this.API_URL}/api/Tickets`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (data) => {
        this.tickets.set(data);
        this.loading.set(false);
        if (ticketId) {
          const t = data.find(x => x.id === ticketId);
          if (t) this.openTicket(t);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  // ── checkPendingPayment ──────────────────────────────────
  // لما الـ tenant يرجع من صفحة الـ callback أو بعد redirect
  private checkPendingPayment() {
    const paymentJustDone = localStorage.getItem('payment_just_done');
    const paymentDoneTicket = localStorage.getItem('payment_done_ticket');

    if (!paymentJustDone) return;

    // امسح فوراً عشان متشغلش كذا مرة
    localStorage.removeItem('payment_just_done');
    localStorage.removeItem('payment_done_ticket');

    // تحقق من الدفع
    this.paymentSvc.verifyPayment(paymentJustDone).subscribe({
      next: (res) => {
        // سواء paid أو لا — reload الـ tickets
        this.loadTickets();

        if (res.isPaid && paymentDoneTicket) {
          // افتح التذكرة تلقائياً بعد ما الـ tickets تـ load
          this.autoOpenTicketAfterPayment(paymentDoneTicket);
        }
      },
      error: () => {
        this.loadTickets();
      }
    });
  }

  // ── autoOpenTicketAfterPayment ───────────────────────────
  // بعد الـ load يفتح التذكرة تلقائياً عشان يشوف زرار الإغلاق
  private autoOpenTicketAfterPayment(ticketId: string) {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const ticket = this.tickets().find(t => t.id === ticketId);
      if (ticket) {
        clearInterval(interval);
        // لو الـ ticket اتحدث وبقى isPaid = true، افتحه
        if (ticket.isPaid) {
          this.openTicket(ticket);
        }
      } else if (attempts > 20) {
        clearInterval(interval);
      }
    }, 200);
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
      error: () => { },
    });
  }

  toggleNotifications() {
    this.showNotifications.update(v => !v);
    if (this.showNotifications()) this.markAllRead();
  }

  markAllRead() {
    this.notifications().filter(n => !n.isRead).forEach(n => {
      this.http.patch(`${this.API_URL}/api/Notifications/${n.id}/read`, {}, { headers: this.getHeaders() }).subscribe();
    });
    this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
  }

  // ── Payment ──────────────────────────────────────────────
  openPayment(ticket: Ticket, event: Event) {
    event.stopPropagation();
    this.paymentTicket.set(ticket);
    this.showPaymentModal.set(true);
  }

  onPaymentClosed() {
    this.showPaymentModal.set(false);
    this.paymentTicket.set(null);
  }

  onPaymentDone() {
    this.showPaymentModal.set(false);
    const currentTicketId = this.paymentTicket()?.id ?? this.selectedTicket()?.id;
    this.paymentTicket.set(null);
    this.selectedTicket.set(null);

    // reload وافتح التذكرة مباشرة من الداتا الجديدة
    this.loading.set(true);
    this.http.get<any[]>(`${this.API_URL}/api/Tickets`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (data) => {
        this.tickets.set(data);
        this.loading.set(false);
        if (currentTicketId) {
          const updated = data.find((t: any) => t.id === currentTicketId);
          if (updated) this.openTicket(updated);
        }
      },
      error: () => { this.loading.set(false); }
    });
  }
  // ── Applications ─────────────────────────────────────────
  openApplications(ticket: Ticket, event: Event) {
    event.stopPropagation();
    this.applicationsTicketId.set(ticket.id);
    this.showApplicationsModal.set(true);
    this.loadApplications(ticket.id);
  }

  loadApplications(ticketId: string) {
    this.loadingApplications.set(true);
    this.applications.set([]);
    this.http.get<TicketApplication[]>(
      `${this.API_URL}/api/TicketApplication/${ticketId}`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => { this.applications.set(data); this.loadingApplications.set(false); },
      error: (err) => { console.error(err); this.loadingApplications.set(false); },
    });
  }

  acceptApplication(applicationId: string) {
    this.acceptingId.set(applicationId);
    this.http.patch(
      `${this.API_URL}/api/Tickets/${applicationId}/accept`, {},
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => { this.acceptingId.set(null); this.showApplicationsModal.set(false); this.loadTickets(); },
      error: (err) => { console.error(err); this.acceptingId.set(null); },
    });
  }

  closeApplicationsModal() { this.showApplicationsModal.set(false); this.applications.set([]); }

  openVendorProfile(vendorId: string, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/vendor-profile', vendorId]);
  }

  // ── Feedback ─────────────────────────────────────────────
  openFeedback(ticket: Ticket, event: Event) {
    event.stopPropagation();
    this.feedbackTicketId.set(ticket.id);
    this.feedbackVendorId.set(ticket.vendorId ?? null);
    this.feedbackComment.set('');
    this.feedbackError.set('');
    this.feedbackSuccess.set(false);
    this.showFeedbackModal.set(true);
  }

  submitFeedback() {
    const comment = this.feedbackComment().trim();
    if (!comment) { this.feedbackError.set('اكتب تعليق الأول'); return; }
    if (!this.feedbackVendorId()) { this.feedbackError.set('لا يوجد فني مرتبط بهذا الطلب'); return; }
    this.feedbackLoading.set(true);
    this.feedbackError.set('');
    this.http.post(
      `${this.API_URL}/api/Feedbacks`,
      { comment, ticketId: this.feedbackTicketId(), vendorId: this.feedbackVendorId() },
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.feedbackLoading.set(false);
        this.feedbackSuccess.set(true);
        setTimeout(() => this.closeFeedbackModal(), 1800);
      },
      error: (err) => {
        this.feedbackLoading.set(false);
        this.feedbackError.set(err?.error?.message ?? 'حصل خطأ، حاول تاني');
      },
    });
  }

  closeFeedbackModal() {
    this.showFeedbackModal.set(false);
    this.feedbackComment.set('');
    this.feedbackSuccess.set(false);
    this.feedbackError.set('');
  }

  // ── Close Ticket ─────────────────────────────────────────
  closeTicketAction(ticketId: string, event: Event) {
    event.stopPropagation();
    this.closingTicketId.set(ticketId);
    this.http.patch(
      `${this.API_URL}/api/Tickets/${ticketId}/close`, {},
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.closingTicketId.set(null);
        this.loadTickets();
        this.closeTicket();
      },
      error: (err) => { console.error(err); this.closingTicketId.set(null); },
    });
  }

  openTicket(t: Ticket) { this.selectedTicket.set(t); this.currentImageIndex.set(0); }
  closeTicket() { this.selectedTicket.set(null); this.closeImage(); }

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

  getPriority(v: string) {
    return this.priorityMap[v] ?? { label: v, color: '#4b5563', bg: '#f3f4f6', dot: '#9ca3af' };
  }
  getStatus(v: string) {
    return this.statusMap[v] ?? { label: v, color: '#4b5563', bg: '#f3f4f6', icon: '•' };
  }

  needsPayment(ticket: Ticket): boolean {
    return ticket.status === 'Resolved' && !ticket.isPaid && ticket.price > 0;
  }
}