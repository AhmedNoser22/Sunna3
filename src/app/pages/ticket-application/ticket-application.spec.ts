import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketApplication } from './ticket-application';

describe('TicketApplication', () => {
  let component: TicketApplication;
  let fixture: ComponentFixture<TicketApplication>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketApplication]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TicketApplication);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
