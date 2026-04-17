import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Auth } from '../../../services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  form = { fullName: '', email: '', password: '' };
  loading = signal(false);
  error = signal('');
  showPass = signal(false);

  constructor(private auth: Auth, private router: Router) {}

  private extractError(err: any): string {
    if (typeof err?.error === 'string') return err.error;
    if (typeof err?.error?.message === 'string') return err.error.message;
    if (typeof err?.message === 'string') return err.message;
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
          queryParams: { email: this.form.email },
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.extractError(err));
      },
    });
  }
}