import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Auth } from '../../../services/auth';
import { GoogleBtn } from "../google-btn/google-btn";

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, GoogleBtn],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  form = { fullName: '', email: '', password: '' };
  loading = signal(false);
  error = signal('');
  showPass = signal(false);

  constructor(private auth: Auth, private router: Router) { }

  private extractError(err: any): string {
    const res = err?.error;

    const message = res?.message || res;
    const code = res?.code;
    const field = res?.field;

    // 🔥 Email errors
    if (field === 'email' || code === 'EMAIL_EXISTS') {
      return 'هذا البريد الإلكتروني مستخدم بالفعل';
    }

    // 🔥 Password errors
    if (field === 'password' || code === 'WEAK_PASSWORD') {
      return 'كلمة المرور ضعيفة، لازم تكون 8 أحرف على الأقل';
    }

    // 🔥 Full name errors
    if (field === 'fullName') {
      return 'الاسم غير صالح';
    }

    // 🔥 Generic auth errors
    if (code === 'INVALID_CREDENTIALS' || message === 'Invalid credentials') {
      return 'بيانات غير صحيحة';
    }

    // fallback
    if (typeof message === 'string') {
      return message;
    }

    return 'حصل خطأ، حاول تاني';
  }

  submit() {
    if (!this.form.fullName || !this.form.email || !this.form.password) {
      this.error.set('من فضلك إملأ كل الحقول');
      return;
    }
    if (this.form.password.length < 8) {
      this.error.set('كلمة المرور لازم تكون 8 حروف على الأقل');
      return;
    }
    this.loading.set(true);
    this.error.set('');

    this.auth.register(this.form).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/confirm-email'], {
          state: { email: this.form.email }
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.extractError(err));
      },
    });
  }
}