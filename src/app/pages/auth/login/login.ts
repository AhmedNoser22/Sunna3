import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { Auth } from '../../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  form = { email: '', password: '' };
  loading = signal(false);
  error = signal('');
  showPass = signal(false);
  justConfirmed = signal(false);
  
  // شلنا القيمة الافتراضية عشان ميحدفش الكل على داشبورد الكلاينت
  private redirectUrl: string | null = null;

  constructor(
    private auth: Auth,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const redirect = this.route.snapshot.queryParamMap.get('redirect');
    const email = this.route.snapshot.queryParamMap.get('email');
    
    if (redirect) {
      this.redirectUrl = redirect.startsWith('/') ? redirect : '/' + redirect;
    }
    
    if (email) {
      this.form.email = email;
      this.justConfirmed.set(true);
    }
  }

  submit() {
    if (!this.form.email || !this.form.password) {
      this.error.set('من فضلك إملأ كل الحقول');
      return;
    }
    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.form).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        
        // المنطق الجديد: لو مفيش رابط محدد من الـ Guard، وجهه حسب وظيفته
        if (this.redirectUrl) {
          this.router.navigateByUrl(this.redirectUrl);
        } else {
          this.navigateBasedOnRole();
        }
      },
      error: (err: any) => {
        this.loading.set(false);
        this.error.set(err?.error ?? 'خطأ في البيانات، حاول تاني');
      },
    });
  }

  private navigateBasedOnRole() {
    if (this.auth.isManager()) {
      console.log('Redirecting to Manager Dashboard...');
      this.router.navigate(['/manager-dashboard']);
    } else {
      console.log('Redirecting to Tenant Dashboard...');
      this.router.navigate(['/dashboard']);
    }
  }
}