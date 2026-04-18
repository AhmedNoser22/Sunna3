import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { Api } from './api';

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
}

@Injectable({ providedIn: 'root' })
export class Auth {
  currentUser = signal<AuthResponse | null>(this.loadUser());

  constructor(private api: Api, private router: Router) { }

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
      })
    );
  }

  resendCode(email: string): Observable<any> {
    return this.api.post('/api/Auth/resend-code', { email });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  isTenant(): boolean {
    return this.currentUser()?.roles?.includes('Tenant') ?? false;
  }

  // ✅ FIX مهم
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