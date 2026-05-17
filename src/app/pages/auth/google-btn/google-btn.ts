import { Component, inject, OnInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../../services/auth';

declare const google: any;

@Component({
  selector: 'app-google-btn',
  standalone: true,
  template: `
    <button class="google-btn" (click)="signInWithGoogle()" [disabled]="loading">
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      {{ loading ? 'جارٍ التسجيل...' : 'تسجيل الدخول بـ Google' }}
    </button>
  `,
  styles: [`
    .google-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 11px 16px;
      border: 1px solid var(--color-border-secondary);
      border-radius: 8px;
      background: var(--color-background-primary);
      color: var(--color-text-primary);
      font-size: 14px;
      cursor: pointer;
      transition: background .15s;
    }
    .google-btn:hover { background: var(--color-background-secondary); }
    .google-btn:disabled { opacity: .6; cursor: not-allowed; }
  `]
})
export class GoogleBtn implements OnInit {
  private auth = inject(Auth);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  loading = false;

  readonly CLIENT_ID = '797767670488-acbfjsrhclh93c7auo6jp44rgsq38gt0.apps.googleusercontent.com';

  ngOnInit() {
    google.accounts.id.initialize({
      client_id: this.CLIENT_ID,
      callback: (response: any) => {
        this.ngZone.run(() => {
          this.handleCredential(response.credential);
        });
      }
    });
  }

  signInWithGoogle() {
    google.accounts.id.prompt();
  }

  private handleCredential(idToken: string) {
    this.loading = true;
    this.auth.googleLogin(idToken).subscribe({
      next: (res) => {
        this.loading = false;
        const role = res.roles[0];
        if (role === 'Manager') this.router.navigate(['/manager-dashboard']);
        else if (role === 'Vendor') this.router.navigate(['/vendor-dashboard']);
        else this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}