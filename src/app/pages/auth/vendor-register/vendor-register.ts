import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { Auth, AuthResponse } from '../../../services/auth';

@Component({
  selector: 'app-vendor-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vendor-register.html',
  styleUrl: './vendor-register.scss',
})
export class VendorRegister implements OnInit {
  private API = environment.apiUrl;

  token = signal('');
  tokenValid = signal<boolean | null>(null);
  checking = signal(true);

  form = {
    PhoneNumber: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  };

  ImageUrl = signal<File | null>(null);
  imagePreview = signal<string | null>(null);

  loading = signal(false);
  error = signal('');
  success = signal(false);
  showPass = signal(false);
  showConfirm = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private auth: Auth
  ) { }

  ngOnInit() {
    const t = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.token.set(t);

    if (!t) {
      this.tokenValid.set(false);
      this.checking.set(false);
      return;
    }

    this.http.get(`${this.API}/api/Invitation/validate/${t}`).subscribe({
      next: () => {
        this.tokenValid.set(true);
        this.checking.set(false);
      },
      error: () => {
        this.tokenValid.set(false);
        this.checking.set(false);
      },

    });
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.ImageUrl.set(file);

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  removeImage() {
    this.ImageUrl.set(null);
    this.imagePreview.set(null);
  }

  submit() {
    if (
      !this.form.fullName ||
      !this.form.email ||
      !this.form.password ||
      !this.form.confirmPassword ||
      !this.form.PhoneNumber
    ) {
      this.error.set('من فضلك إملأ كل الحقول');
      return;
    }

    if (this.form.password !== this.form.confirmPassword) {
      this.error.set('كلمتا المرور غير متطابقتين');
      return;
    }

    if (this.form.password.length < 6) {
      this.error.set('كلمة المرور لازم تكون 6 أحرف على الأقل');
      return;
    }

    const phoneRegex = /^(\+20|0)?1[0125]\d{8}$/;
    if (!phoneRegex.test(this.form.PhoneNumber)) {
      this.error.set('رقم الهاتف غير صحيح');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const formData = new FormData();
    formData.append('fullName', this.form.fullName);
    formData.append('email', this.form.email);
    formData.append('password', this.form.password);
    formData.append('PhoneNumber', this.form.PhoneNumber);
    formData.append('Token', this.token());

    if (this.ImageUrl()) {
      formData.append('Image', this.ImageUrl()!);
    }

    this.http
      .post(`${this.API}/api/Invitation/register-vendor`, formData)
      .subscribe({
        next: (res: any) => {
          this.loading.set(false);

          const userData: AuthResponse = {
            token: res.token,
            email: this.form.email,
            fullName: this.form.fullName,
            roles: ['Vendor'],
            phone: this.form.PhoneNumber,           // ✅ ضيف
            profileImageUrl: res.profileImageUrl ?? null,  // ✅ ضيف
          };

          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(userData));
          this.auth.currentUser.set(userData);

          this.success.set(true);
          setTimeout(() => this.router.navigate(['/vendor-dashboard']), 1000);
        },
        error: (err: any) => {
          this.loading.set(false);
          this.error.set(err?.error?.message ?? 'حدث خطأ، حاول تاني');
        },
      });
  }
}