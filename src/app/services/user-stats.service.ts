import { Injectable } from '@angular/core';
import { Observable, of, from, map, catchError } from 'rxjs';
import { UserStats } from '../types';
import { SupabaseService } from './supabase.service';

@Injectable({
    providedIn: 'root'
})
export class UserStatsService {

    constructor(private supabaseService: SupabaseService) { }

    // Get user stats from database
    getUserStats(): Observable<UserStats> {
        const user = this.supabaseService.user;
        if (!user) {
            return of({
                wins: 'Wins: 0',
                losses: 0,
                nfts: 0,
                streak: 0,
                games: 0
            });
        }

        return from(
            this.supabaseService.db
                .from('users')
                .select('wins, losses, draws, games_played, current_elo, highest_elo')
                .eq('id', user.id)
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error || !data) {
                    return {
                        wins: 'Wins: 0',
                        losses: 0,
                        draws: 0,
                        nfts: 0,
                        streak: 0,
                        games: 0,
                        winPercentage: 0
                    };
                }

                // Calculate win percentage
                const winPercentage = data.games_played > 0
                    ? Math.round((data.wins / data.games_played) * 100)
                    : 0;

                return {
                    wins: `Wins: ${data.wins}`,
                    losses: data.losses || 0,
                    draws: data.draws || 0,
                    nfts: 0, // TODO: Get actual NFT count from NFTService
                    streak: winPercentage, // Using win percentage as streak for now
                    games: data.games_played || 0,
                    winPercentage
                };
            }),
            catchError(() => of({
                wins: 'Wins: 0',
                losses: 0,
                draws: 0,
                nfts: 0,
                streak: 0,
                games: 0,
                winPercentage: 0
            }))
        );
    }

    // Get user's current ELO rating
    getCurrentElo(): Observable<number> {
        const user = this.supabaseService.user;
        if (!user) {
            return of(1000); // Default starting ELO
        }

        return from(
            this.supabaseService.db
                .from('users')
                .select('current_elo')
                .eq('id', user.id)
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error || !data) {
                    return 1000;
                }
                return data.current_elo || 1000;
            }),
            catchError(() => of(1000))
        );
    }

    // Get user's highest ELO rating
    getHighestElo(): Observable<number> {
        const user = this.supabaseService.user;
        if (!user) {
            return of(1000);
        }

        return from(
            this.supabaseService.db
                .from('users')
                .select('highest_elo')
                .eq('id', user.id)
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error || !data) {
                    return 1000;
                }
                return data.highest_elo || 1000;
            }),
            catchError(() => of(1000))
        );
    }

    // Get detailed statistics
    getDetailedStats(): Observable<{
        totalGames: number;
        wins: number;
        losses: number;
        draws: number;
        winRate: number;
        currentElo: number;
        highestElo: number;
        averageOpponentElo?: number;
    }> {
        const user = this.supabaseService.user;
        if (!user) {
            return of({
                totalGames: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                winRate: 0,
                currentElo: 1000,
                highestElo: 1000
            });
        }

        return from(
            this.supabaseService.db
                .from('users')
                .select('wins, losses, draws, games_played, current_elo, highest_elo')
                .eq('id', user.id)
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error || !data) {
                    return {
                        totalGames: 0,
                        wins: 0,
                        losses: 0,
                        draws: 0,
                        winRate: 0,
                        currentElo: 1000,
                        highestElo: 1000
                    };
                }

                const winRate = data.games_played > 0
                    ? (data.wins / data.games_played) * 100
                    : 0;

                return {
                    totalGames: data.games_played || 0,
                    wins: data.wins || 0,
                    losses: data.losses || 0,
                    draws: data.draws || 0,
                    winRate: Math.round(winRate * 100) / 100, // Round to 2 decimal places
                    currentElo: data.current_elo || 1000,
                    highestElo: data.highest_elo || 1000
                };
            }),
            catchError(() => of({
                totalGames: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                winRate: 0,
                currentElo: 1000,
                highestElo: 1000
            }))
        );
    }
} 