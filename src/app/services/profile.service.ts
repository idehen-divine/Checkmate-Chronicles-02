import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { UserProfile, UserStats, NFTItem, MatchHistoryItem } from '../types';

@Injectable({
    providedIn: 'root'
})
export class ProfileService {

    constructor(private router: Router) { }

    // Get user profile data
    getUserProfile(): Observable<UserProfile> {
        // In a real app, this would fetch from an API
        const profile: UserProfile = {
            name: 'Ethan',
            username: 'ethan.eth',
            rank: 'Grandmaster | #1234',
            avatar: 'http://localhost:3845/assets/bcce636c9b18e5da2017a0428d0e42716f62f8fb.png'
        };
        return of(profile);
    }

    // Get user stats
    getUserStats(): Observable<UserStats> {
        // In a real app, this would fetch from an API
        const stats: UserStats = {
            wins: 'Wins: 120',
            losses: 30,
            nfts: 5,
            streak: 3,
            games: 150
        };
        return of(stats);
    }

    // Get NFT collection
    getNFTCollection(): Observable<NFTItem[]> {
        // In a real app, this would fetch from an API
        const nfts: NFTItem[] = [
            {
                name: 'GMX',
                symbol: 'GMX',
                image: 'http://localhost:3845/assets/2782308dc0b24f656b737fc7b47c3545451de4fd.png',
                price: '$16.01',
                priceChange: '+5.7%',
                isPositive: true
            },
            {
                name: 'tokenbot',
                symbol: 'CLANKER',
                image: 'http://localhost:3845/assets/b8f331df61548e679db134dc47b62c8eb89765c4.png',
                price: '$25.47',
                priceChange: '+3.8%',
                isPositive: true
            },
            {
                name: 'Echelon Prime',
                symbol: 'PRIME',
                image: 'http://localhost:3845/assets/70dc5f40694629c9b51ff63ef7e6de08e5c800e0.png',
                price: '$2.57',
                priceChange: '+1.9%',
                isPositive: true
            },
            {
                name: 'Freysa AI',
                symbol: 'FAI',
                image: 'http://localhost:3845/assets/2782308dc0b24f656b737fc7b47c3545451de4fd.png',
                price: '$0.02150',
                priceChange: '-2.4%',
                isPositive: false
            },
            {
                name: 'Axelar',
                symbol: 'AXL',
                image: 'http://localhost:3845/assets/b8f331df61548e679db134dc47b62c8eb89765c4.png',
                price: '$0.4266',
                priceChange: '+0.3%',
                isPositive: true
            }
        ];
        return of(nfts);
    }

    // Get match history
    getMatchHistory(): Observable<MatchHistoryItem[]> {
        // In a real app, this would fetch from an API
        const matches: MatchHistoryItem[] = [
            {
                title: 'Match vs. Liam',
                result: 'Won',
                opponentId: 'liam_123',
                opponentName: 'Liam',
                eloChange: '+24 ELO',
                date: '2 hours ago'
            },
            {
                title: 'Match vs. Olivia',
                result: 'Lost',
                opponentId: 'olivia_456',
                opponentName: 'Olivia',
                eloChange: '-18 ELO',
                date: '1 day ago'
            },
            {
                title: 'Match vs. Noah',
                result: 'Won',
                opponentId: 'noah_789',
                opponentName: 'Noah',
                eloChange: '+31 ELO',
                date: '3 days ago'
            }
        ];
        return of(matches);
    }

    // Navigate to opponent profile
    viewOpponentProfile(opponentId: string): void {
        console.log('Navigating to opponent profile:', opponentId);
        // In a real app, this would navigate to the opponent's profile
        // this.router.navigate(['/profile', opponentId]);
    }

    // Edit profile action
    editProfile(): void {
        console.log('Edit profile clicked');
        // In a real app, this would navigate to edit profile page
        // this.router.navigate(['/profile/edit']);
    }

    // View public profile action
    viewPublicProfile(): void {
        console.log('View public profile clicked');
        // In a real app, this would navigate to public profile view
        // this.router.navigate(['/profile/public']);
    }
} 