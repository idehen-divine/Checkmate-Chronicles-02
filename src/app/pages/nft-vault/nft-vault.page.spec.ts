import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NftVaultPage } from './nft-vault.page';

describe('NftVaultPage', () => {
  let component: NftVaultPage;
  let fixture: ComponentFixture<NftVaultPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NftVaultPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
