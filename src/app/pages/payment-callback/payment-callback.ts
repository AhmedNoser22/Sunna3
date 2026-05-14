import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { PaymentService } from '../../services/payment-service';

@Component({
  selector: 'app-payment-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display:flex;flex-direction:column;align-items:center;
                justify-content:center;min-height:100vh;
                font-family:'Cairo',sans-serif;direction:rtl;gap:16px;
                background:#F6F7F9;">
      @if (status() === 'checking') {
        <div style="width:48px;height:48px;border:4px solid #EAF0F7;
                    border-top-color:#4A7A9B;border-radius:50%;
                    animation:spin .7s linear infinite"></div>
        <h2 style="color:#1E2532;margin:0">جاري تأكيد الدفع...</h2>
      }
      @if (status() === 'success') {
        <div style="font-size:52px">✅</div>
        <h2 style="color:#2A6B4A;margin:0">تم الدفع بنجاح!</h2>
        <p style="color:#717D8F;margin:0">جاري تحويلك...</p>
      }
      @if (status() === 'failed') {
        <div style="font-size:52px">❌</div>
        <h2 style="color:#8A2B2B;margin:0">لم يتم الدفع</h2>
        <p style="color:#717D8F;margin:0">جاري تحويلك...</p>
      }
      <style>@keyframes spin { to { transform:rotate(360deg); } }</style>
    </div>
  `
})
export class PaymentCallback implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private paymentSvc = inject(PaymentService);

  status = signal<'checking' | 'success' | 'failed'>('checking');

  ngOnInit() {
    const params    = this.route.snapshot.queryParams;
    const success   = params['success'];
    const paymentId = localStorage.getItem('pending_payment_id');
    const ticketId  = localStorage.getItem('pending_payment_ticket') ?? '';

    localStorage.removeItem('pending_payment_id');
    localStorage.removeItem('pending_payment_ticket');

    if (success === 'true' && paymentId) {
      this.paymentSvc.markPaid(paymentId).subscribe({
        next: () => {
          this.status.set('success');
          localStorage.setItem('payment_just_done', paymentId);
          localStorage.setItem('payment_done_ticket', ticketId);
          setTimeout(() => this.router.navigate(['/dashboard']), 1500);
        },
        error: () => {
          this.status.set('success');
          localStorage.setItem('payment_just_done', paymentId);
          localStorage.setItem('payment_done_ticket', ticketId);
          setTimeout(() => this.router.navigate(['/dashboard']), 1500);
        }
      });
    } else {
      this.status.set('failed');
      setTimeout(() => this.router.navigate(['/dashboard']), 2000);
    }
  }
}