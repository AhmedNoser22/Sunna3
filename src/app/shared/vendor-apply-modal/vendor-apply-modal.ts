import { Component, signal, output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';

@Component({
  selector: 'app-vendor-apply-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './vendor-apply-modal.html',
  styleUrl: './vendor-apply-modal.scss'
})
export class VendorApplyModal {
  private http = inject(HttpClient);

  close = output<void>();

  loading = signal(false);
  submitted = signal(false);
  error = signal<string | null>(null);

  form = {
    fullName: '',
    phone: '',
    specialty: '',
    customSpecialty: '',
    yearsExperience: null as number | null,
    bio: ''
  };

  specialties = [
    'سباكة',
    'كهرباء',
    'نجارة',
    'تكييف وتبريد',
    'نقاشة',
    'أخري'
  ];

  onBackdrop(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close.emit();
    }
  }

  submit() {
    if (!this.form.fullName || !this.form.phone || !this.form.specialty) {
      this.error.set('بياناتك ناقصة يا هندسة، كمل النجوم الحمرا *');
      return;
    }
    if (this.form.specialty === 'أخري' && !this.form.customSpecialty.trim()) {
      this.error.set('اكتب تخصصك في الخانة اللي ظهرت دي *');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const payload = {
      fullName: this.form.fullName,
      phoneNumber: this.form.phone,
      specialization: this.form.specialty === 'أخري'
      ? this.form.customSpecialty.trim()
      : this.form.specialty,
      yearsOfExperience: this.form.yearsExperience ?? 0,
      bio: this.form.bio || null
    };

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });

    this.http
      .post(`${environment.apiUrl}/api/vendors/profile`, payload, { headers })
      .subscribe({
        next: () => {
          this.submitted.set(true);
          this.loading.set(false);
        },
        error: (err) => {
          const msg =
            err?.error?.message ||
            err?.error?.title ||
            'حصل مشكلة في الإرسال، جرب تاني';
          this.error.set(msg);
          this.loading.set(false);
        }
      });
  }
}