import { Component, inject, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../../services/auth';

declare const google: any;

@Component({
  selector: 'app-google-btn',
  standalone: true,
  template: `
    <button class="google-btn" (click)="signInWithGoogle()" [disabled]="loading">
      <svg width="20" height="20" viewBox="0 0 48 48" style="flex-shrink:0">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      <span>{{ loading ? 'جارٍ التسجيل...' : 'المتابعة باستخدام Google' }}</span>
    </button>
  `,
  styles: [`
  button {
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 13px 20px;
    border: 1.5px solid #DDE0E5;
    border-radius: 12px;
    background: #FFFFFF;
    color: #1E2532;
    font-family: 'Cairo', sans-serif;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    white-space: nowrap;
  }
  button:hover:not(:disabled) {
    background: #F6F7F9;
    border-color: #9DB5CC;
  }
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  svg { flex-shrink: 0; }
  span { white-space: nowrap; }
`]
})
export class GoogleBtn {
  private auth = inject(Auth);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  loading = false;

  readonly CLIENT_ID = '797767670488-acbfjsrhclh93c7auo6jp44rgsq38gt0.apps.googleusercontent.com';

  signInWithGoogle() {
    this.loading = true;

    const client = google.accounts.oauth2.initTokenClient({
      client_id: this.CLIENT_ID,
      scope: 'openid email profile',
      callback: '',
    });

    // بدل الـ token flow نستخدم id_token flow عن طريق popup
    const width = 500, height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      redirect_uri: window.location.origin,
      response_type: 'token id_token',
      scope: 'openid email profile',
      nonce: Math.random().toString(36).substring(2),
      prompt: 'select_account',
    });

    const popup = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      'google-login',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    const timer = setInterval(() => {
      try {
        if (!popup || popup.closed) {
          clearInterval(timer);
          this.loading = false;
          return;
        }
        const url = popup.location.href;
        if (url.includes(window.location.origin)) {
          popup.close();
          clearInterval(timer);
          const hash = new URLSearchParams(popup.location.hash.substring(1));
          const idToken = hash.get('id_token');
          if (idToken) {
            this.ngZone.run(() => this.handleCredential(idToken));
          } else {
            this.loading = false;
          }
        }
      } catch (e) {
        // cross-origin error — popup لسه في google، استنى
      }
    }, 300);
  }

  private handleCredential(idToken: string) {
    this.auth.googleLogin(idToken).subscribe({
      next: (res) => {
        this.loading = false;
        const role = res.roles[0];
        if (role === 'Manager') this.router.navigate(['/manager-dashboard']);
        else if (role === 'Vendor') this.router.navigate(['/vendor-dashboard']);
        else this.router.navigate(['/dashboard']);
      },
      error: () => { this.loading = false; }
    });
  }
}