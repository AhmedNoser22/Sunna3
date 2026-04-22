import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Vedorprofile } from './vedorprofile';

describe('Vedorprofile', () => {
  let component: Vedorprofile;
  let fixture: ComponentFixture<Vedorprofile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Vedorprofile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Vedorprofile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
