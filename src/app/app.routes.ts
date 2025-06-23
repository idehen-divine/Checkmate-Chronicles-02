import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { GuestGuard } from './guards/guest.guard';

export const routes: Routes = [
	{
		path: '',
		redirectTo: 'auth',
		pathMatch: 'full',
	},
	{
		path: 'auth',
		loadComponent: () => import('./pages/auth/auth.page').then(m => m.AuthPage),
		canActivate: [GuestGuard]
	},
	{
		path: 'dashboard',
		loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage),
		canActivate: [AuthGuard]
	},
	{
		path: 'settings',
		loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage),
		canActivate: [AuthGuard]
	},
	{
		path: 'marketplace',
		loadComponent: () => import('./pages/marketplace/marketplace.page').then(m => m.MarketplacePage),
		canActivate: [AuthGuard]
	},
	{
		path: 'tournaments',
		loadComponent: () => import('./pages/tournaments/tournaments.page').then(m => m.TournamentsPage),
		canActivate: [AuthGuard]
	},
	{
		path: 'nft-vault',
		loadComponent: () => import('./pages/nft-vault/nft-vault.page').then(m => m.NftVaultPage),
		canActivate: [AuthGuard]
	},
	{
		path: 'my-nfts',
		loadComponent: () => import('./pages/my-nfts/my-nfts.page').then(m => m.MyNftsPage),
		canActivate: [AuthGuard]
	},
	{
		path: 'friends',
		loadComponent: () => import('./pages/friends/friends.page').then(m => m.FriendsPage),
		canActivate: [AuthGuard]
	},
	{
		path: 'coming-soon',
		loadComponent: () => import('./pages/coming-soon/coming-soon.page').then(m => m.ComingSoonPage)
	},
	{
		path: 'game/:slug',
		loadComponent: () => import('./pages/game/game.page').then(m => m.GamePage),
		canActivate: [AuthGuard]
	},
	{
		path: 'game',
		loadComponent: () => import('./pages/game/game.page').then(m => m.GamePage),
		canActivate: [AuthGuard]
	},
	{
		path: 'profile',
		loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage),
		canActivate: [AuthGuard]
	},
	{
		path: 'play',
		children: [
			{
				path: '',
				loadComponent: () => import('./pages/play/play/play.page').then(m => m.PlayPage)
			},
			{
				path: 'quick-match',
				loadComponent: () => import('./pages/quick-play/quick-play.page').then(m => m.QuickPlayPage),
				canActivate: [AuthGuard]
			}
		]
	},
	{
		path: '**',
		loadComponent: () => import('./pages/not-found/not-found.page').then(m => m.NotFoundPage),
		pathMatch: 'full'
	},

];
