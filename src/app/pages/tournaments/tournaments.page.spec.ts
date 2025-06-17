import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TournamentsPage } from './tournaments.page';

describe('TournamentsPage', () => {
  let component: TournamentsPage;
  let fixture: ComponentFixture<TournamentsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TournamentsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
