import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuickPlayPage } from './quick-play.page';

describe('QuickPlayPage', () => {
  let component: QuickPlayPage;
  let fixture: ComponentFixture<QuickPlayPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(QuickPlayPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
