
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InitiatePaymentDto {
  ticketId: string;
  paymentMethod: 'card' | 'wallet';
  walletNumber?: string;
}

export interface PaymentResponseDto {
  paymentId: string;
  iframeUrl?: string;    // لو card
  redirectUrl?: string;  // لو wallet
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private http = inject(HttpClient);
  readonly API_URL = 'http://localhost:5001';

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
}