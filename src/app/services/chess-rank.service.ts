import { Injectable } from '@angular/core';
import { Observable, of, from, map, catchError } from 'rxjs';
import { ChessRank } from '../types';
import { SupabaseService } from './supabase.service';

@Injectable({
    providedIn: 'root'
})
export class ChessRankService {

    constructor(private supabaseService: SupabaseService) { }

    // Get all chess ranks ordered by rank_order
    getChessRanks(): Observable<ChessRank[]> {
        return from(
            this.supabaseService.db
                .from('game_ranking')
                .select('*')
                .order('min_elo', { ascending: true })
        ).pipe(
            map(({ data, error }) => {
                if (error || !data) {
                    return [];
                }
                return data.map(rank => ({
                    id: rank.id,
                    name: rank.name,
                    min_elo: rank.min_elo,
                    max_elo: rank.max_elo,
                    description: rank.description
                }));
            }),
            catchError(() => of([]))
        );
    }

    // Get rank by ELO rating
    getRankByElo(elo: number): Observable<ChessRank | null> {
        return from(
            this.supabaseService.db
                .from('game_ranking')
                .select('*')
                .lte('min_elo', elo)
                .or(`max_elo.is.null,max_elo.gte.${elo}`)
                .order('min_elo', { ascending: false })
                .limit(1)
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error || !data) {
                    return null;
                }
                return {
                    id: data.id,
                    name: data.name,
                    min_elo: data.min_elo,
                    max_elo: data.max_elo,
                    description: data.description
                };
            }),
            catchError(() => of(null))
        );
    }

    // Get next rank for a given ELO
    getNextRank(currentElo: number): Observable<ChessRank | null> {
        return from(
            this.supabaseService.db
                .from('game_ranking')
                .select('*')
                .gt('min_elo', currentElo)
                .order('min_elo')
                .limit(1)
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error || !data) {
                    return null; // Already at highest rank or error
                }
                return {
                    id: data.id,
                    name: data.name,
                    min_elo: data.min_elo,
                    max_elo: data.max_elo,
                    description: data.description
                };
            }),
            catchError(() => of(null))
        );
    }

    // Get rank progress (how far user is in current rank)
    getRankProgress(elo: number): Observable<{
        currentRank: ChessRank | null;
        nextRank: ChessRank | null;
        progressPercentage: number;
        eloToNextRank: number;
    }> {
        return this.getChessRanks().pipe(
            map((ranks) => {
                const currentRank = ranks.find(rank =>
                    rank.min_elo <= elo && (rank.max_elo === null || elo <= rank.max_elo)
                ) || null;

                if (!currentRank) {
                    return {
                        currentRank: null,
                        nextRank: null,
                        progressPercentage: 0,
                        eloToNextRank: 0
                    };
                }

                const nextRank = ranks.find(rank => rank.min_elo > elo) || null;

                let progressPercentage = 0;
                let eloToNextRank = 0;

                if (nextRank) {
                    const rankRange = nextRank.min_elo - currentRank.min_elo;
                    const currentProgress = elo - currentRank.min_elo;
                    progressPercentage = Math.round((currentProgress / rankRange) * 100);
                    eloToNextRank = nextRank.min_elo - elo;
                } else {
                    // At highest rank
                    if (currentRank.max_elo) {
                        const rankRange = currentRank.max_elo - currentRank.min_elo;
                        const currentProgress = elo - currentRank.min_elo;
                        progressPercentage = Math.min(100, Math.round((currentProgress / rankRange) * 100));
                    } else {
                        progressPercentage = 100; // Grandmaster is open-ended
                    }
                }

                return {
                    currentRank: currentRank,
                    nextRank: nextRank,
                    progressPercentage: Math.max(0, Math.min(100, progressPercentage)),
                    eloToNextRank: Math.max(0, eloToNextRank)
                };
            }),
            catchError(() => of({
                currentRank: null,
                nextRank: null,
                progressPercentage: 0,
                eloToNextRank: 0
            }))
        );
    }

    // Get formatted rank display string
    getFormattedRankDisplay(elo: number): Observable<string> {
        return this.getRankByElo(elo).pipe(
            map(rank => {
                if (!rank) {
                    return `Novice | ${elo}`;
                }
                return `${rank.name} | ${elo}`;
            })
        );
    }

    async getUserRank(userId: string): Promise<ChessRank | null> {
        // First get user's ELO
        const { data: userData, error: userError } = await this.supabaseService.db
            .from('users')
            .select('elo')
            .eq('id', userId)
            .single();

        if (userError || !userData) {
            console.error('Error fetching user ELO:', userError);
            return null;
        }

        // Convert Observable to Promise
        return new Promise((resolve) => {
            this.getRankByElo(userData.elo).subscribe(rank => resolve(rank));
        });
    }

    getRankColor(rankName: string): string {
        const colors: { [key: string]: string } = {
            'Beginner': '#8B4513',      // Brown
            'Intermediate': '#C0C0C0',   // Silver
            'Advanced': '#FFD700',       // Gold
            'Master': '#800080',         // Purple
            'Grandmaster': '#FF0000'     // Red
        };
        return colors[rankName] || '#8B4513';
    }

    formatRankDisplay(rank: ChessRank, elo: number): string {
        return `${rank.name} | ${elo}`;
    }

    getProgressInRank(rank: ChessRank, elo: number): number {
        if (!rank.max_elo) return 100; // Grandmaster is always 100%

        const progress = ((elo - rank.min_elo) / (rank.max_elo - rank.min_elo)) * 100;
        return Math.max(0, Math.min(100, progress));
    }
} 