import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface InitiatePaymentDto {
  ticketId: string;
  paymentMethod: 'card' | 'wallet';
  walletNumber?: string;
}

export interface PaymentResponseDto {
  paymentId: string;
  iframeUrl?: string;
  redirectUrl?: string;
}

export interface VerifyPaymentResponseDto {
  isPaid: boolean;
  ticketId?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private http = inject(HttpClient);
  readonly API_URL = environment.apiUrl;

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  initiatePayment(dto: InitiatePaymentDto): Observable<PaymentResponseDto> {
    return this.http.post<PaymentResponseDto>(
      `${this.API_URL}/api/payment/initiate`,
      dto,
      { headers: this.headers() }
    );
  }

  verifyPayment(paymentId: string): Observable<VerifyPaymentResponseDto> {
  return this.http.get<VerifyPaymentResponseDto>(
    `${this.API_URL}/api/payment/verify/${paymentId}`,
    { headers: this.headers() }
  );
}
// في payment-service.ts — أضف
markPaid(paymentId: string): Observable<{ isPaid: boolean; ticketId?: string }> {
  return this.http.post<{ isPaid: boolean; ticketId?: string }>(
    `${this.API_URL}/api/payment/mark-paid/${paymentId}`,
    {},
    { headers: this.headers() }
  );
}
}