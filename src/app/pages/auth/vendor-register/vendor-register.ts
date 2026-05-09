import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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

  token      = signal('');
  tokenValid = signal<boolean | null>(null);
  checking   = signal(true);

  form = {
    PhoneNumber:    '',
    fullName:       '',
    email:          '',
    password:       '',
    confirmPassword:'',
    IBAN:           '',
    BankName:       '',
    InstapayNumber: '',
    WalletNumber:   '',
  };

  // ── اختيار طرق الدفع ─────────────────────────────────
  wantsBank     = signal(false);
  wantsInstapay = signal(false);
  wantsWallet   = signal(false);

  ImageUrl     = signal<File | null>(null);
  imagePreview = signal<string | null>(null);

  loading     = signal(false);
  error       = signal('');
  success     = signal(false);
  showPass    = signal(false);
  showConfirm = signal(false);

  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    private http:   HttpClient,
    private auth:   Auth
  ) {}

  ngOnInit() {
    const t = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.token.set(t);

    if (!t) {
      this.tokenValid.set(false);
      this.checking.set(false);
      return;
    }

    this.http.get(`${this.API}/api/Invitation/validate/${t}`).subscribe({
      next:  () => { this.tokenValid.set(true);  this.checking.set(false); },
      error: () => { this.tokenValid.set(false); this.checking.set(false); },
    });
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    this.ImageUrl.set(file);
    const reader = new FileReader();
    reader.onload = () => this.imagePreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  removeImage() {
    this.ImageUrl.set(null);
    this.imagePreview.set(null);
  }

  submit() {
    // ── Validation ──────────────────────────────────────
    if (!this.form.fullName || !this.form.email || !this.form.password ||
        !this.form.confirmPassword || !this.form.PhoneNumber) {
      this.error.set('من فضلك إملأ الحقول الإلزامية');
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

    // ── تحقق إن الفيندور اختار طريقة دفع واحدة على الأقل ──
    if (!this.wantsBank() && !this.wantsInstapay() && !this.wantsWallet()) {
      this.error.set('من فضلك اختار طريقة دفع واحدة على الأقل لاستلام أرباحك');
      return;
    }

    // ── تحقق إن الحقول المطلوبة للطرق المختارة مملوءة ──
    if (this.wantsBank() && !this.form.IBAN.trim()) {
      this.error.set('اختارت التحويل البنكي — من فضلك ادخل رقم IBAN');
      return;
    }
    if (this.wantsInstapay() && !this.form.InstapayNumber.trim()) {
      this.error.set('اختارت InstaPay — من فضلك ادخل اسم المستخدم');
      return;
    }
    if (this.wantsWallet() && !this.form.WalletNumber.trim()) {
      this.error.set('اختارت المحفظة الإلكترونية — من فضلك ادخل رقم المحفظة');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const formData = new FormData();
    formData.append('fullName',    this.form.fullName);
    formData.append('email',       this.form.email);
    formData.append('password',    this.form.password);
    formData.append('PhoneNumber', this.form.PhoneNumber);
    formData.append('Token',       this.token());

    // ── بيانات الدفع (بس اللي اتاختار) ──
    if (this.wantsBank()) {
      if (this.form.IBAN.trim())     formData.append('IBAN',     this.form.IBAN.trim());
      if (this.form.BankName.trim()) formData.append('BankName', this.form.BankName.trim());
    }
    if (this.wantsInstapay() && this.form.InstapayNumber.trim()) {
      formData.append('InstapayNumber', this.form.InstapayNumber.trim());
    }
    if (this.wantsWallet() && this.form.WalletNumber.trim()) {
      formData.append('WalletNumber', this.form.WalletNumber.trim());
    }

    if (this.ImageUrl()) {
      formData.append('Image', this.ImageUrl()!);
    }

    this.http.post(`${this.API}/api/Invitation/register-vendor`, formData).subscribe({
      next: (res: any) => {
        this.loading.set(false);

        const userData: AuthResponse = {
          token:           res.token,
          email:           this.form.email,
          fullName:        this.form.fullName,
          roles:           ['Vendor'],
          phone:           this.form.PhoneNumber,
          profileImageUrl: res.profileImageUrl ?? null,
        };

        localStorage.setItem('token', res.token);
        localStorage.setItem('user',  JSON.stringify(userData));
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