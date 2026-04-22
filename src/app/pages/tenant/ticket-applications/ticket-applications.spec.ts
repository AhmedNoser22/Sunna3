import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketApplications } from './ticket-applications';

describe('TicketApplications', () => {
  let component: TicketApplications;
  let fixture: ComponentFixture<TicketApplications>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketApplications]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TicketApplications);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
