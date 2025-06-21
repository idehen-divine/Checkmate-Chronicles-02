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
                .from('chess_ranks')
                .select('*')
                .order('rank_order')
        ).pipe(
            map(({ data, error }) => {
                if (error || !data) {
                    return [];
                }
                return data.map(rank => ({
                    id: rank.id,
                    name: rank.name,
                    display_name: rank.display_name,
                    min_elo: rank.min_elo,
                    max_elo: rank.max_elo,
                    color_code: rank.color_code,
                    rank_order: rank.rank_order
                }));
            }),
            catchError(() => of([]))
        );
    }

    // Get rank by ELO rating
    getRankByElo(elo: number): Observable<ChessRank | null> {
        return from(
            this.supabaseService.db
                .from('chess_ranks')
                .select('*')
                .lte('min_elo', elo)
                .or(`max_elo.is.null,max_elo.gte.${elo}`)
                .order('rank_order', { ascending: false })
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
                    display_name: data.display_name,
                    min_elo: data.min_elo,
                    max_elo: data.max_elo,
                    color_code: data.color_code,
                    rank_order: data.rank_order
                };
            }),
            catchError(() => of(null))
        );
    }

    // Get next rank for a given ELO
    getNextRank(currentElo: number): Observable<ChessRank | null> {
        return from(
            this.supabaseService.db
                .from('chess_ranks')
                .select('*')
                .gt('min_elo', currentElo)
                .order('rank_order')
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
                    display_name: data.display_name,
                    min_elo: data.min_elo,
                    max_elo: data.max_elo,
                    color_code: data.color_code,
                    rank_order: data.rank_order
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
        return from(
            this.supabaseService.db
                .from('chess_ranks')
                .select('*')
                .order('rank_order')
        ).pipe(
            map(({ data, error }) => {
                if (error || !data) {
                    return {
                        currentRank: null,
                        nextRank: null,
                        progressPercentage: 0,
                        eloToNextRank: 0
                    };
                }

                // Find current rank
                const currentRank = data.find(rank => 
                    rank.min_elo <= elo && (rank.max_elo === null || elo <= rank.max_elo)
                );

                if (!currentRank) {
                    return {
                        currentRank: null,
                        nextRank: null,
                        progressPercentage: 0,
                        eloToNextRank: 0
                    };
                }

                // Find next rank
                const nextRank = data.find(rank => rank.rank_order === currentRank.rank_order + 1);

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
                        progressPercentage = 100; // Master rank is open-ended
                    }
                }

                return {
                    currentRank: {
                        id: currentRank.id,
                        name: currentRank.name,
                        display_name: currentRank.display_name,
                        min_elo: currentRank.min_elo,
                        max_elo: currentRank.max_elo,
                        color_code: currentRank.color_code,
                        rank_order: currentRank.rank_order
                    },
                    nextRank: nextRank ? {
                        id: nextRank.id,
                        name: nextRank.name,
                        display_name: nextRank.display_name,
                        min_elo: nextRank.min_elo,
                        max_elo: nextRank.max_elo,
                        color_code: nextRank.color_code,
                        rank_order: nextRank.rank_order
                    } : null,
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
                return `${rank.display_name} | ${elo}`;
            })
        );
    }
} 