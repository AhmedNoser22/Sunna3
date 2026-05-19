import { Component, signal, output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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
    bio: '',
    agreedToTerms: false
  };
  idCardFront = signal<File | null>(null);
  idCardBack = signal<File | null>(null);
  frontPreview = signal<string | null>(null);
  backPreview = signal<string | null>(null);

  specialties = [
    'سباكة',
    'كهرباء',
    'نجارة',
    'تكييف وتبريد',
    'نقاشة',
    'أخري'
  ];
  onIdCardSelected(side: 'front' | 'back', event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (side === 'front') {
        this.idCardFront.set(file);
        this.frontPreview.set(reader.result as string);
      } else {
        this.idCardBack.set(file);
        this.backPreview.set(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  }
  onBackdrop(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close.emit();
    }
  }
  submit() {
    if (!this.form.fullName || !this.form.phone || !this.form.specialty) {
      this.error.set('بياناتك ناقصة، كمل الحقول المطلوبة *');
      return;
    }
    if (!this.idCardFront() || !this.idCardBack()) {
      this.error.set('ارفع صورة وجه وظهر البطاقة *');
      return;
    }
    if (!this.form.agreedToTerms) {
      this.error.set('الموافقة على الشروط والأحكام *');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const fd = new FormData();
    fd.append('FullName', this.form.fullName);
    fd.append('PhoneNumber', this.form.phone);
    fd.append('Specialization', this.form.specialty === 'أخري' ? this.form.customSpecialty.trim() : this.form.specialty);
    fd.append('YearsOfExperience', String(this.form.yearsExperience ?? 0));
    if (this.form.bio) fd.append('Bio', this.form.bio);
    fd.append('IdCardFront', this.idCardFront()!);
    fd.append('IdCardBack', this.idCardBack()!);

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});

    this.http.post(`${environment.apiUrl}/api/vendors/profile`, fd, { headers }).subscribe({
      next: () => { this.submitted.set(true); this.loading.set(false); },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'حصل مشكلة في الإرسال');
        this.loading.set(false);
      }
    });
  }
}