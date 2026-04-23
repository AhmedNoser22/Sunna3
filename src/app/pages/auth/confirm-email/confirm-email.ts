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
          this.router.navigate(['/create-ticket']);
        }, 1200);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error || 'الكود غير صحيح');
      }
    });
  }
  
  resend() {
    this.auth.resendCode(this.email()).subscribe({
      next: () => alert('تم إرسال الكود'),
      
    });
  }
}