import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api } from '../../../services/api';
import { Auth } from '../../../services/auth';

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type ProblemType = 'Electrical' | 'Plumbing' | 'AC' | 'Other';

@Component({
  selector: 'app-create-ticket',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-ticket.html',
  styleUrl: './create-ticket.scss',
})
export class CreateTicket {
  // Services
  private api = inject(Api);
  private router = inject(Router);
  public auth = inject(Auth);

  // States
  step = signal(1);
  loading = signal(false);
  error = signal('');
  success = signal(false);

  // Form Data
  form = {
    problemType: '' as ProblemType,
    description: '',
    priority: 'Medium' as Priority,
    tenantLocation: '',
    arrival: '',
    deadline: '',
    companyId: '',
  };

  selectedImages: File[] = [];
  imagePreviews: string[] = [];

  // Options
  priorities: { value: Priority; label: string; color: string; icon: string }[] = [
    { value: 'Low', label: 'منخفضة', color: '#10b981', icon: '🟢' },
    { value: 'Medium', label: 'متوسطة', color: '#f59e0b', icon: '🟡' },
    { value: 'High', label: 'عالية', color: '#ef4444', icon: '🔴' },
    { value: 'Critical', label: 'حرجة', color: '#7c3aed', icon: '🚨' },
  ];

  problemTypes: { value: ProblemType; label: string; icon: string }[] = [
    { value: 'Electrical', label: 'كهرباء', icon: '⚡️' },
    { value: 'Plumbing', label: 'سباكة', icon: '🚿' },
    { value: 'AC', label: 'تكييف', icon: '❄️' },
    { value: 'Other', label: 'أخرى', icon: '🔧' },
  ];

  // ✅ الميثود اللي كانت ناقصة وعملت الـ Error
  goToDashboard() { 
    this.router.navigate(['/dashboard']); 
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
      if (!this.form.tenantLocation.trim()) { this.error.set('اكتب موقع الوحدة'); return; }
      if (!this.form.arrival) { this.error.set('حدد وقت الوصول'); return; }
      if (!this.form.deadline) { this.error.set('حدد الموعد النهائي'); return; }
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
        const msg = err?.error?.errors 
          ? Object.values(err.error.errors).flat().join(', ') 
          : (err?.error?.message ?? 'حصل خطأ في البيانات المرسلة');
        this.error.set(msg);
      },
    });
  }

  // Helpers for Template
  getPriorityLabel(v: Priority) { return this.priorities.find(p => p.value === v)?.label ?? v; }
  getProblemLabel(v: ProblemType) { return this.problemTypes.find(t => t.value === v)?.label ?? v; }
  getProblemIcon(v: ProblemType) { return this.problemTypes.find(t => t.value === v)?.icon ?? '🔧'; }
  getPriorityColor(v: Priority) { return this.priorities.find(p => p.value === v)?.color ?? '#7c3aed'; }
}