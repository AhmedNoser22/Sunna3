import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { Auth } from '../../../services/auth';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './confirm-email.html',
  styleUrl: './confirm-email.scss',
})
export class ConfirmEmail implements OnInit {
  code = '';
  email = signal('');
  loading = signal(false);
  error = signal('');
  success = signal(false);
  resending = signal(false);
  resendSuccess = signal(false);
  resendError = signal('');
  constructor(
    private auth: Auth,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) this.email.set(email);
  }

  submit() {
    if (!this.code || this.code.length < 6) {
      this.error.set('أدخل الكود المكون من 6 أرقام');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.auth.confirmEmail({
      email: this.email(),
      code: this.code
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.success.set(true);

        localStorage.setItem('token', res.token);

        setTimeout(() => {
          if (this.auth.isManager()) {
            this.router.navigate(['/manager-dashboard']);
          } else if (this.auth.isVendor()) {
            this.router.navigate(['/vendor-dashboard']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        }, 1200);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error || 'الكود غير صحيح');
      }
    });
  }

  resend() {
    if (!this.email()) return;

    this.resending.set(true);
    this.resendSuccess.set(false);
    this.resendError.set('');

    this.auth.resendCode(this.email()).subscribe({
      next: () => {
        this.resending.set(false);
        this.resendSuccess.set(true);

        setTimeout(() => {
          this.resendSuccess.set(false);
        }, 3000);
      },

      error: (err) => {
        this.resending.set(false);
        this.resendError.set(err?.error || 'فشل إرسال الكود');
      }
    });
  }
}