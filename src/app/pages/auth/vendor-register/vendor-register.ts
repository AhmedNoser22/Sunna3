import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';

@Component({
  selector: 'app-vendor-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './vendor-register.html',
  styleUrl: './vendor-register.scss',
})
export class VendorRegister implements OnInit {
  private API = environment.apiUrl;

  token = signal('');
  tokenValid = signal<boolean | null>(null); // null = جارٍ التحقق
  checking = signal(true);

  form = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  };

  loading = signal(false);
  error = signal('');
  success = signal(false);
  showPass = signal(false);
  showConfirm = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit() {
    const t = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.token.set(t);

    if (!t) {
      this.tokenValid.set(false);
      this.checking.set(false);
      return;
    }

    // التحقق من صلاحية التوكن
    this.http
      .get(`${this.API}/api/Invitation/validate/${t}`)
      .subscribe({
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

  submit() {
    if (
      !this.form.fullName ||
      !this.form.email ||
      !this.form.password ||
      !this.form.confirmPassword
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

    this.loading.set(true);
    this.error.set('');

    const body = {
      token: this.token(),
      fullName: this.form.fullName,
      email: this.form.email,
      password: this.form.password,
    };

    this.http
      .post(`${this.API}/api/Invitation/register-vendor`, body)
      .subscribe({
        next: (res: any) => {
          this.loading.set(false);

          // 👇 خد التوكن من الباك
          const token = res.token;

          if (token) {
            localStorage.setItem('token', token);

            // 👇 ده أهم سطر
            localStorage.setItem(
              'user',
              JSON.stringify({
                token: token,
                email: this.form.email,
                fullName: this.form.fullName,
                roles: ['Vendor'], // 👈 عشان الـ guard
              })
            );
          }

          this.success.set(true);

          // 👇 ادخل على الداشبورد مباشرة
          setTimeout(() => {
            this.router.navigate(['/vendor-dashboard']);
          }, 1000);
        },
        error: (err: any) => {
          this.loading.set(false);
          this.error.set(
            err?.error?.message ?? 'حدث خطأ، حاول تاني'
          );
        },
      });
  }
}