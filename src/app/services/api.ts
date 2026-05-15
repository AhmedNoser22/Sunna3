import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class Api {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, body);
  }

  postForm<T>(path: string, body: FormData): Observable<T> {
    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.post<T>(`${this.base}${path}`, body, { headers });
  }

  // ✅ الحل هنا (overload)
  get<T>(path: string): Observable<T>;
  get<T>(path: string, options: { observe: 'events' }): Observable<HttpEvent<T>>;
  get<T>(path: string, options?: any): Observable<any> {
    return this.http.get<T>(`${this.base}${path}`, options);
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.base}${path}`, body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.base}${path}`);
  }
}