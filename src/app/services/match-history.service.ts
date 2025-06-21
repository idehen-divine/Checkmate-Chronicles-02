import { Injectable } from '@angular/core';
import { Observable, of, from, map, catchError } from 'rxjs';
import { MatchHistoryItem, RatingHistoryItem } from '../types';
import { SupabaseService } from './supabase.service';
import * as ChessUtils from '../utils/chess.util';

@Injectable({
    providedIn: 'root'
})
export class MatchHistoryService {

    constructor(private supabaseService: SupabaseService) { }

    // Get match history with rating changes
    getMatchHistory(limit: number = 10): Observable<MatchHistoryItem[]> {
        const user = this.supabaseService.user;
        if (!user) {
            return of([]);
        }

        return from(
            this.supabaseService.db
                .rpc('get_rating_progression', { 
                    p_user_id: user.id, 
                    p_limit: limit 
                })
        ).pipe(
            map(({ data, error }) => {
                if (error || !data) {
                    return [];
                }                return data.map((record: any) => ChessUtils.createMatchHistoryItem(record));
            }),
            catchError(() => of([]))
        );
    }

    // Get user's rating progression
    getRatingProgression(limit: number = 30): Observable<RatingHistoryItem[]> {
        const user = this.supabaseService.user;
        if (!user) {
            return of([]);
        }

        return from(
            this.supabaseService.db
                .rpc('get_rating_progression', { 
                    p_user_id: user.id, 
                    p_limit: limit 
                })
        ).pipe(
            map(({ data, error }) => {
                if (error || !data) {
                    return [];
                }

                return data.map((record: any) => ({
                    id: record.id || `${record.date}_${record.elo}`,
                    date: new Date(record.date).toISOString(),
                    elo: record.elo,
                    elo_change: record.elo_change,
                    rank_name: record.rank_name,
                    game_result: record.game_result,
                    opponent_username: record.opponent_username
                }));
            }),
            catchError(() => of([]))
        );
    }

    // Get recent games summary
    getRecentGamesSummary(days: number = 7): Observable<{
        totalGames: number;
        wins: number;
        losses: number;
        draws: number;
        eloChange: number;
        winRate: number;
    }> {
        const user = this.supabaseService.user;
        if (!user) {
            return of({
                totalGames: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                eloChange: 0,
                winRate: 0
            });
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        return from(
            this.supabaseService.db
                .from('user_rating_history')
                .select('*')
                .eq('user_id', user.id)
                .gte('created_at', cutoffDate.toISOString())
                .order('created_at', { ascending: false })
        ).pipe(
            map(({ data, error }) => {
                if (error || !data || data.length === 0) {
                    return {
                        totalGames: 0,
                        wins: 0,
                        losses: 0,
                        draws: 0,
                        eloChange: 0,
                        winRate: 0
                    };
                }

                const wins = data.filter(game => game.game_result === 'win').length;
                const losses = data.filter(game => game.game_result === 'loss').length;
                const draws = data.filter(game => game.game_result === 'draw').length;
                const totalGames = data.length;
                const eloChange = data.reduce((sum, game) => sum + game.elo_change, 0);
                const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

                return {
                    totalGames,
                    wins,
                    losses,
                    draws,
                    eloChange,
                    winRate: Math.round(winRate * 100) / 100
                };
            }),
            catchError(() => of({
                totalGames: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                eloChange: 0,
                winRate: 0
            }))
        );
    }

    // Get rating history for charts/graphs
    getRatingHistoryForChart(limit: number = 50): Observable<{
        date: string;
        elo: number;
    }[]> {
        const user = this.supabaseService.user;
        if (!user) {
            return of([]);
        }

        return from(
            this.supabaseService.db
                .from('user_rating_history')
                .select('created_at, new_elo')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true })
                .limit(limit)
        ).pipe(
            map(({ data, error }) => {
                if (error || !data) {
                    return [];
                }

                return data.map(record => ({
                    date: new Date(record.created_at).toLocaleDateString(),
                    elo: record.new_elo
                }));
            }),
            catchError(() => of([]))
        );
    }

    // Get opponent statistics
    getOpponentStats(opponentId: string): Observable<{
        gamesPlayed: number;
        wins: number;
        losses: number;
        draws: number;
        lastPlayed?: string;
    }> {
        const user = this.supabaseService.user;
        if (!user) {
            return of({
                gamesPlayed: 0,
                wins: 0,
                losses: 0,
                draws: 0
            });
        }

        return from(
            this.supabaseService.db
                .from('user_rating_history')
                .select('*')
                .eq('user_id', user.id)
                .eq('opponent_id', opponentId)
                .order('created_at', { ascending: false })
        ).pipe(
            map(({ data, error }) => {
                if (error || !data || data.length === 0) {
                    return {
                        gamesPlayed: 0,
                        wins: 0,
                        losses: 0,
                        draws: 0
                    };
                }

                const wins = data.filter(game => game.game_result === 'win').length;
                const losses = data.filter(game => game.game_result === 'loss').length;
                const draws = data.filter(game => game.game_result === 'draw').length;
                const lastPlayed = data[0]?.created_at;

                return {
                    gamesPlayed: data.length,
                    wins,
                    losses,
                    draws,
                    lastPlayed: lastPlayed ? new Date(lastPlayed).toLocaleDateString() : undefined
                };
            }),
            catchError(() => of({
                gamesPlayed: 0,
                wins: 0,
                losses: 0,
                draws: 0
            }))
        );
    }
} 