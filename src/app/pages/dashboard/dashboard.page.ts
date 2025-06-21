import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { IonContent, IonButton } from '@ionic/angular/standalone';
import { SideBarComponent } from '../../components/navigation/side-bar/side-bar.component';
import { BottomNavComponent } from '../../components/navigation/bottom-nav/bottom-nav.component';
import { HeaderToolbarComponent } from '../../components/navigation/header-toolbar/header-toolbar.component';
import { NavigationComponent, createNavigationMixin } from '../../utils';

@Component({
	selector: 'app-dashboard',
	templateUrl: './dashboard.page.html',
	styleUrls: ['./dashboard.page.scss'],
	standalone: true,
	imports: [IonContent, IonButton, CommonModule, FormsModule, SideBarComponent, BottomNavComponent, HeaderToolbarComponent]
})
export class DashboardPage implements OnInit, NavigationComponent {

	// Navigation utility
	private navigationMethods: ReturnType<typeof createNavigationMixin>;

	constructor(
		private router: Router,
		private location: Location
	) {
		// Initialize navigation methods using the mixin
		this.navigationMethods = createNavigationMixin(this.router, this.location);
	}

	ngOnInit() {
		// Dashboard initialization logic here
	}

	// Navigation Methods - Use the mixin methods
	onSidebarNavigation(navigationTarget: string): void {
		this.navigationMethods.onSidebarNavigation(navigationTarget);
	}

	onBottomNavigation(navigationTarget: string): void {
		this.navigationMethods.onBottomNavigation(navigationTarget);
	}

	onBottomSubmenuNavigation(navigationTarget: string): void {
		this.navigationMethods.onBottomSubmenuNavigation(navigationTarget);
	}

	// Header Actions - Use the mixin methods
	goBack(): void {
		this.navigationMethods.goBack();
	}

	openMenu(): void {
		this.navigationMethods.openMenu();
	}
}
