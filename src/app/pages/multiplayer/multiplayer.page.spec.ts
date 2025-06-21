import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MultiplayerPage } from './multiplayer.page';

describe('MultiplayerPage', () => {
    let component: MultiplayerPage;
    let fixture: ComponentFixture<MultiplayerPage>;

    beforeEach(() => {
        fixture = TestBed.createComponent(MultiplayerPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
}); 