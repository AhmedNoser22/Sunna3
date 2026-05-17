import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { Api } from './api';
import { NotificationService } from './notification-service';


export interface RegisterDto {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ConfirmEmailDto {
  email: string;
  code: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  fullName: string;
  roles: string[];
  phone?: string;
  profileImageUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class Auth {
  currentUser = signal<AuthResponse | null>(this.loadUser());
  private notificationService = inject(NotificationService);
  constructor(private api: Api, private router: Router) {
    const token = localStorage.getItem('token');
    if (token) this.notificationService.connect(token);
  }
  private loadUser(): AuthResponse | null {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  register(dto: RegisterDto): Observable<string> {
    return this.api.post<string>('/api/Auth/register', dto);
  }

  confirmEmail(dto: ConfirmEmailDto): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/api/Auth/confirm-email', dto).pipe(
      tap((data) => {
        if (data?.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data));
          this.currentUser.set(data);
          this.notificationService.connect(data.token);
        }
      })
    );
  }

  login(dto: LoginDto): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/api/Auth/login', dto).pipe(
      tap((res) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res));
        this.currentUser.set(res);
        this.notificationService.connect(res.token);
      })
    );
  }

  resendCode(email: string): Observable<any> {
    return this.api.post('/api/Auth/resend-code', { email });
  }
  googleLogin(idToken: string): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/api/Auth/google-login', { idToken }).pipe(
      tap((res) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res));
        this.currentUser.set(res);
        this.notificationService.connect(res.token);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.notificationService.disconnect();
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  isTenant(): boolean {
    return this.currentUser()?.roles?.includes('Tenant') ?? false;
  }


  isManager(): boolean {
    return this.currentUser()?.roles?.includes('Manager') ?? false;
  }
  isVendor(): boolean {
    return this.currentUser()?.roles?.includes('Vendor') ?? false;
  }
  getToken(): string | null {
    return localStorage.getItem('token');
  }
}