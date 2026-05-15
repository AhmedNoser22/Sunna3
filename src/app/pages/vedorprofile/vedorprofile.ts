import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from '../../services/auth';
import { environment } from '../../../environments/environment';

interface FeedbackItem {
  id: string;
  comment: string;
  tenantName: string;
  tenantId: string;
}

interface VendorTicketHistory {
  ticketId: string;
  description: string;
  status: string;
  governorate: string;
  city: string;
  createdAt: string;
  feedbacks: FeedbackItem[];
}

interface VendorProfileData {
  vendorId: string;
  fullName: string;
  phone: string;
  imageUrl?: string;
  ticketHistory: VendorTicketHistory[];
}

@Component(
  {
    selector: 'app-vedorprofile',
    imports: [], templateUrl: './vedorprofile.html',
    styleUrl: './vedorprofile.scss',
  })
export class VendorProfile implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
 readonly API_URL = environment.apiUrl;

  profile = signal<VendorProfileData | null>(null);
  loading = signal(true);
  error = signal('');

  statusMap: Record<string, { label: string; color: string; bg: string }> = {
    Pending: { label: 'انتظار', color: '#b45309', bg: '#fef9c3' },
    vendorAccepted: { label: 'جارٍ التنفيذ', color: '#1d4ed8', bg: '#dbeafe' },
    Resolved: { label: 'تم الإنجاز', color: '#15803d', bg: '#dcfce7' },
    Closed: { label: 'مغلق', color: '#4b5563', bg: '#f3f4f6' },
  };

  stats = computed(() => {
    const p = this.profile();
    if (!p) return { total: 0, done: 0, feedbacks: 0 };
    return {
      total: p.ticketHistory.length,
      done: p.ticketHistory.filter(t => t.status === 'Resolved' || t.status === 'Closed').length,
      feedbacks: p.ticketHistory.reduce((acc, t) => acc + t.feedbacks.length, 0),
    };
  });

  constructor(public auth: Auth, router: Router) { }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/']); return; }
    this.loadProfile(id);
  }

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  loadProfile(id: string) {
    this.loading.set(true);
    this.http.get<VendorProfileData>(
      `${this.API_URL}/api/Vendors/${id}/profile`,
      { headers: this.headers() }
    ).subscribe({
      next: (data) => { this.profile.set(data); this.loading.set(false); },
      error: () => { this.error.set('تعذّر تحميل الملف الشخصي'); this.loading.set(false); },
    });
  }
  goBack() {
    window.history.length > 1
      ? window.history.back()
      : this.router.navigate(['/dashboard']);
  }

  getStatus(v: string) {
    return this.statusMap[v] ?? { label: v, color: '#4b5563', bg: '#f3f4f6' };
  }
}