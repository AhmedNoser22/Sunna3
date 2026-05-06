import {
  Component, Input, Output, EventEmitter,
  signal, inject, OnInit
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
  styleUrl:    './payment-modal.scss',
})
export class PaymentModal implements OnInit {
  // ── Inputs ──────────────────────────────────────────────
  @Input() ticketId!: string;
  @Input() ticketDescription!: string;
  @Input() amount!: number;                 // المبلغ بالجنيه

  // ── Outputs ─────────────────────────────────────────────
  @Output() closed        = new EventEmitter<void>();
  @Output() paymentDone   = new EventEmitter<void>();  // بعد ما webhook يتم — لو بتعمل polling

  // ── Services ────────────────────────────────────────────
  private paymentSvc = inject(PaymentService);
  private sanitizer  = inject(DomSanitizer);

  // ── State ────────────────────────────────────────────────
  step = signal<'choose' | 'iframe' | 'redirect' | 'success'>('choose');

  selectedMethod = signal<'card' | 'wallet'>('card');
  walletNumber   = signal('');

  loading  = signal(false);
  error    = signal('');

  iframeUrl:   SafeResourceUrl | null = null;
  redirectUrl: string | null = null;

  // ── Computed helpers ─────────────────────────────────────
  get platformFee()  { return +(this.amount * 0.10).toFixed(2); }
  get totalDisplay() { return this.amount; }   // الـ tenant بيدفع الـ total فقط

  ngOnInit() {}

  // ── اختيار طريقة الدفع ──────────────────────────────────
  selectMethod(m: 'card' | 'wallet') {
    this.selectedMethod.set(m);
    this.error.set('');
    this.walletNumber.set('');
  }

  // ── ابدأ الدفع ──────────────────────────────────────────
  pay() {
    if (this.selectedMethod() === 'wallet' && !this.walletNumber().trim()) {
      this.error.set('ادخل رقم المحفظة الأول');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.paymentSvc.initiatePayment({
      ticketId:     this.ticketId,
      paymentMethod: this.selectedMethod(),
      walletNumber:  this.selectedMethod() === 'wallet' ? this.walletNumber() : undefined,
    }).subscribe({
      next: (res) => {
        this.loading.set(false);

        if (res.iframeUrl) {
          // card → افتح iframe
          this.iframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(res.iframeUrl);
          this.step.set('iframe');
        } else if (res.redirectUrl) {
          // wallet → redirect
          this.redirectUrl = res.redirectUrl;
          this.step.set('redirect');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'حصل خطأ، حاول تاني');
      },
    });
  }

  // ── بعد ما الـ iframe يخلص ──────────────────────────────
  // Paymob بيعمل redirect بعد الدفع، بس في حالة iframe مش هيحصل callback
  // الحل: polling كل 5 ثواني على حالة الـ payment أو تستخدم signalR
  // للتبسيط: زرار "تأكيد الدفع" يدوسه المستخدم بعد ما يخلص في الـ iframe
  confirmIframeDone() {
    this.step.set('success');
    setTimeout(() => this.paymentDone.emit(), 1500);
  }

  // ── فتح الـ redirect url في tab جديد ────────────────────
  openWalletRedirect() {
    window.open(this.redirectUrl!, '_blank');
    // بعد ما يرجع → يدوس "تم الدفع"
    this.step.set('success');
    setTimeout(() => this.paymentDone.emit(), 1500);
  }

  close() {
    this.closed.emit();
  }
}