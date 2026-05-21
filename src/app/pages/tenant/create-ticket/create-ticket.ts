import { Component, signal, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api } from '../../../services/api';
import { Auth } from '../../../services/auth';
import { EGYPT_DATA, GOVERNORATES } from '../../../data';

export type Priority = 'Low' | 'Medium' | 'High' | 'Emergency';
export type ProblemType =
  | 'Electrical'
  | 'Plumbing'
  | 'AC'
  | 'Carpentry'
  | 'Painting'
  | 'Masonry'
  | 'Flooring'
  | 'Welding'
  | 'Pest'
  | 'Cleaning'
  | 'Other';

@Component({
  selector: 'app-create-ticket',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-ticket.html',
  styleUrl: './create-ticket.scss',
})
export class CreateTicket implements AfterViewInit {
  @ViewChild('typeTrack') typeTrackRef!: ElementRef<HTMLDivElement>;

  private api = inject(Api);
  private router = inject(Router);
  public auth = inject(Auth);

  step = signal(1);
  loading = signal(false);
  error = signal('');
  success = signal(false);

  typeCarouselIndex = signal(0); // which "page" of types is visible (0-based)
  readonly TYPES_PER_VIEW = 3; // how many cards visible at once

  readonly governorates = GOVERNORATES;
  cities: string[] = [];

  form = {
    problemType: '' as ProblemType,
    description: '',
    priority: 'Medium' as Priority,
    tenantLocation: '',
    governorate: '',
    city: '',
    arrival: '',
    deadline: '',
    companyId: '',
  };


  selectedImages: File[] = [];
  imagePreviews: string[] = [];

  priorities: { value: Priority; label: string; color: string; icon: string }[] = [
    { value: 'Low', label: 'منخفضة', color: '#10b981', icon: '🟢' },
    { value: 'Medium', label: 'متوسطة', color: '#f59e0b', icon: '🟡' },
    { value: 'High', label: 'عالية', color: '#ef4444', icon: '🔴' },
    { value: 'Emergency', label: 'حرجة', color: '#7c3aed', icon: '🚨' },
  ];

  problemTypes: { value: ProblemType; label: string; icon: string }[] = [
    { value: 'Electrical', label: 'كهرباء', icon: '⚡️' },
    { value: 'Plumbing', label: 'سباكة', icon: '🚿' },
    { value: 'AC', label: 'تكييف', icon: '❄️' },
    { value: 'Carpentry', label: 'نجارة', icon: '🪚' },
    { value: 'Painting', label: 'دهانات', icon: '🎨' },
    { value: 'Masonry', label: 'بناء', icon: '🧱' },
    { value: 'Flooring', label: 'أرضيات', icon: '🏗️' },
    { value: 'Welding', label: 'حدادة', icon: '🔩' },
    { value: 'Pest', label: 'حشرات', icon: '🪲' },
    { value: 'Cleaning', label: 'تنظيف', icon: '🧹' },
    { value: 'Other', label: 'أخرى', icon: '🔧' },
  ];

  get totalPages(): number {
    return Math.ceil(this.problemTypes.length / this.TYPES_PER_VIEW);
  }

  get visibleTypes() {
    const start = this.typeCarouselIndex() * this.TYPES_PER_VIEW;
    return this.problemTypes.slice(start, start + this.TYPES_PER_VIEW);
  }

  carouselNext() {
    if (this.typeCarouselIndex() < this.totalPages - 1) {
      this.typeCarouselIndex.set(this.typeCarouselIndex() + 1);
    }
  }

  carouselPrev() {
    if (this.typeCarouselIndex() > 0) {
      this.typeCarouselIndex.set(this.typeCarouselIndex() - 1);
    }
  }


  ngAfterViewInit() { }

  /** Returns current datetime string formatted for datetime-local input */
  get nowDateTimeLocal(): string {
    const now = new Date();
    // offset for local time
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }

  onGovernorateChange(gov: string) {
    this.form.governorate = gov;
    this.form.city = '';
    this.cities = EGYPT_DATA[gov] ?? [];
  }

  goToDashboard() {
    this.router.navigate(['/dashboard'], { replaceUrl: true });
  }

  selectType(t: ProblemType) {
    this.form.problemType = t;
    this.error.set('');
  }

  selectPriority(p: Priority) {
    this.form.priority = p;
  }

  nextStep() {
    if (this.step() === 1) {
      if (!this.form.problemType) { this.error.set('اختار نوع المشكلة الأول'); return; }
      if (!this.form.description.trim()) { this.error.set('اكتب وصف للمشكلة'); return; }
    }
    if (this.step() === 2) {
      if (!this.form.governorate) { this.error.set('اختار المحافظة'); return; }
      if (!this.form.city) { this.error.set('اختار المدينة'); return; }
      if (!this.form.tenantLocation.trim()) { this.error.set('اكتب تفاصيل الموقع'); return; }
      if (!this.form.arrival) { this.error.set('حدد وقت الوصول'); return; }
      if (!this.form.deadline) { this.error.set('حدد الموعد النهائي'); return; }

      const now = new Date();
      const arrival = new Date(this.form.arrival);
      const deadline = new Date(this.form.deadline);

      if (arrival <= now) { this.error.set('وقت الوصول لازم يكون في المستقبل'); return; }
      if (deadline <= arrival) { this.error.set('الموعد النهائي لازم يكون بعد وقت الوصول'); return; }
    }
    this.error.set('');
    this.step.set(this.step() + 1);
  }

  prevStep() {
    this.error.set('');
    this.step.set(this.step() - 1);
  }

  onImageSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    Array.from(input.files).forEach((file) => {
      if (this.selectedImages.length >= 5) return;
      this.selectedImages.push(file);
      const reader = new FileReader();
      reader.onload = (e) => this.imagePreviews.push(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  }

  removeImage(i: number) {
    this.selectedImages.splice(i, 1);
    this.imagePreviews.splice(i, 1);
  }

  submit() {
    this.loading.set(true);
    this.error.set('');

    const fd = new FormData();
    fd.append('Description', this.form.description);
    fd.append('Priority', this.form.priority);
    fd.append('ProblemType', this.form.problemType);
    fd.append('TenantLocation', this.form.tenantLocation);
    fd.append('Governorate', this.form.governorate);
    fd.append('City', this.form.city);
    fd.append('Arrival', new Date(this.form.arrival).toISOString());
    fd.append('Deadline', new Date(this.form.deadline).toISOString());

    if (this.form.companyId) {
      fd.append('CompanyId', this.form.companyId);
    }

    this.selectedImages.forEach((f) => fd.append('Images', f, f.name));

    this.api.postForm<any>('/api/Tickets', fd).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
        setTimeout(() => this.goToDashboard(), 2000);
      },
      error: (err) => {
        this.loading.set(false);

        // تجاهل Error الصور لو مفيش صور مرفوعة
        if (
          err?.error?.errors?.Images &&
          this.selectedImages.length === 0
        ) {
          delete err.error.errors.Images;
        }

        const errors = err?.error?.errors;

        const msg =
          errors && Object.keys(errors).length > 0
            ? Object.values(errors).flat().join(', ')
            : (err?.error?.message ?? 'حصل خطأ في البيانات المرسلة');

        this.error.set(msg);
      },
    });
  }

  getPriorityLabel(v: Priority) { return this.priorities.find(p => p.value === v)?.label ?? v; }
  getProblemLabel(v: ProblemType) { return this.problemTypes.find(t => t.value === v)?.label ?? v; }
  getProblemIcon(v: ProblemType) { return this.problemTypes.find(t => t.value === v)?.icon ?? '🔧'; }
  getPriorityColor(v: Priority) { return this.priorities.find(p => p.value === v)?.color ?? '#7c3aed'; }
}