import {
  Component, Input, Output, EventEmitter,
  signal, inject, OnInit, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PaymentService } from '../../services/payment-service';

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-modal.html',
  styleUrl: './payment-modal.scss',
})
export class PaymentModal implements OnInit, OnDestroy {

  @Input() ticketId!: string;
  @Input() ticketDescription!: string;
  @Input() amount!: number;

  @Output() closed = new EventEmitter<void>();
  @Output() paymentDone = new EventEmitter<void>();

  private paymentSvc = inject(PaymentService);
  private sanitizer = inject(DomSanitizer);

  step = signal<'choose' | 'iframe' | 'redirect' | 'verifying' | 'success'>('choose');
  selectedMethod = signal<'card' | 'wallet'>('card');
  walletNumber = signal('');
  loading = signal(false);
  error = signal('');

  iframeUrl: SafeResourceUrl | null = null;
  redirectUrl: string | null = null;
  currentPaymentId = '';

  private pollInterval: any;
  private pollAttempts = 0;
  private msgListener: ((e: MessageEvent) => void) | null = null;

  get platformFee() { return +(this.amount * 0.10).toFixed(2); }
  get vendorShare() { return +(this.amount * 0.90).toFixed(2); }
  get totalDisplay() { return this.amount; }

  ngOnInit() {
    // استمع لـ postMessage من Paymob iframe
    this.msgListener = (event: MessageEvent) => {
      try {
        const d = typeof event.data === 'string'
          ? JSON.parse(event.data) : event.data;
        if (d?.success === true && this.step() === 'iframe') {
          this.startVerifying();
        }
      } catch { }
    };
    window.addEventListener('message', this.msgListener);
  }

  ngOnDestroy() {
    this.stopPolling();
    if (this.msgListener)
      window.removeEventListener('message', this.msgListener);
  }

  selectMethod(m: 'card' | 'wallet') {
    this.selectedMethod.set(m);
    this.error.set('');
    this.walletNumber.set('');
  }

  pay() {
    if (this.selectedMethod() === 'wallet' && !this.walletNumber().trim()) {
      this.error.set('ادخل رقم المحفظة أولاً');
      return;
    }
    this.loading.set(true);
    this.error.set('');

    this.paymentSvc.initiatePayment({
      ticketId: this.ticketId,
      paymentMethod: this.selectedMethod(),
      walletNumber: this.selectedMethod() === 'wallet'
        ? this.walletNumber() : undefined,
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.currentPaymentId = res.paymentId;

        // ✅ حفظ الـ paymentId الحقيقي بتاعنا
        localStorage.setItem('pending_payment_id', res.paymentId);
        localStorage.setItem('pending_payment_ticket', this.ticketId);

        if (res.iframeUrl) {
          this.iframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(res.iframeUrl);
          this.step.set('iframe');
        } else if (res.redirectUrl) {
          this.redirectUrl = res.redirectUrl;
          this.step.set('redirect');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'حصل خطأ أثناء بدء الدفع');
      }
    });
  }

  confirmIframeDone() {
    this.startVerifying();
  }

  openWalletRedirect() {
    if (!this.redirectUrl) return;
    window.open(this.redirectUrl, '_blank');
    this.startVerifying();
  }

  private startVerifying() {
    this.step.set('verifying');
    this.pollAttempts = 0;
    this.stopPolling();

    // أول check بعد ثانية واحدة
    setTimeout(() => this.checkPayment(), 1000);

    // بعدين كل 3 ثواني
    this.pollInterval = setInterval(() => {
      this.pollAttempts++;
      if (this.pollAttempts > 40) {
        this.stopPolling();
        this.error.set('التأكيد اتأخر — اضغط "تحديث" في الصفحة');
        this.step.set('choose');
        return;
      }
      this.checkPayment();
    }, 3000);
  }

  private checkPayment() {
    if (!this.currentPaymentId) return;

    this.paymentSvc.verifyPayment(this.currentPaymentId).subscribe({
      next: (res) => {
        if (res.isPaid) {
          this.stopPolling();
          localStorage.removeItem('pending_payment_id');
          localStorage.removeItem('pending_payment_ticket');
          this.step.set('success');
          // ✅ emit بعد ثانية — الداشبورد هيعمل reload ويفتح التذكرة
          setTimeout(() => this.paymentDone.emit(), 1500);
        }
      },
      error: () => { /* retry */ }
    });
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  close() {
    this.stopPolling();
    this.closed.emit();
  }
}