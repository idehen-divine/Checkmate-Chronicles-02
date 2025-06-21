import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Subscription } from 'rxjs';

export interface OnlinePlayer {
    id: string;
    username: string;
    avatar?: string;
    current_elo: number;
    current_rank_name?: string;
    is_online: boolean;
    games_played: number;
    wins: number;
    losses: number;
    draws: number;
    last_seen?: string;
}

export interface GameInvitation {
    id: string;
    from_user_id: string;
    to_user_id: string;
    from_user: OnlinePlayer;
    to_user: OnlinePlayer;
    time_control: {
        initial_time: number;
        increment: number;
    };
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    created_at: string;
    expires_at: string;
}

@Injectable({
    providedIn: 'root'
})
export class MatchmakingService {
    constructor(private supabaseService: SupabaseService) { }

    // Get online players (mock implementation for now)
    async getOnlinePlayers(): Promise<OnlinePlayer[]> {
        // Return mock data for demonstration
        return [
            {
                id: '1',
                username: 'ChessMaster2000',
                avatar: '/assets/images/profile-avatar.png',
                current_elo: 1850,
                current_rank_name: 'Expert',
                is_online: true,
                games_played: 245,
                wins: 180,
                losses: 45,
                draws: 20,
                last_seen: new Date().toISOString()
            },
            {
                id: '2',
                username: 'QueenGambit',
                avatar: '/assets/images/profile-avatar-large.png',
                current_elo: 1920,
                current_rank_name: 'Expert',
                is_online: true,
                games_played: 189,
                wins: 145,
                losses: 30,
                draws: 14,
                last_seen: new Date().toISOString()
            }
        ];
    }

    // Send invitation (mock implementation)
    async sendInvitation(fromUserId: string, toUserId: string, timeControl: any): Promise<void> {
        console.log('Sending invitation from', fromUserId, 'to', toUserId, 'with time control', timeControl);
    }

    // Get sent invitations (mock implementation)
    async getSentInvitations(userId: string): Promise<GameInvitation[]> {
        return [];
    }

    // Get received invitations (mock implementation)
    async getReceivedInvitations(userId: string): Promise<GameInvitation[]> {
        return [];
    }

    // Accept invitation (mock implementation)
    async acceptInvitation(invitationId: string): Promise<string> {
        return 'mock-game-id';
    }

    // Decline invitation (mock implementation)
    async declineInvitation(invitationId: string): Promise<void> {
        console.log('Declining invitation', invitationId);
    }

    // Cancel invitation (mock implementation)
    async cancelInvitation(invitationId: string): Promise<void> {
        console.log('Cancelling invitation', invitationId);
    }

    // Join matchmaking queue (mock implementation)
    async joinMatchmakingQueue(userId: string, timeControl: any): Promise<void> {
        console.log('Joining matchmaking queue for user', userId);
    }

    // Leave matchmaking queue (mock implementation)
    async leaveMatchmakingQueue(userId: string): Promise<void> {
        console.log('Leaving matchmaking queue for user', userId);
    }

    // Subscribe to invitations (mock implementation)
    subscribeToInvitations(userId: string, callback: () => void): Subscription {
        return {
            unsubscribe: () => console.log('Unsubscribing from invitations for user', userId)
        } as Subscription;
    }

    // Subscribe to online players (mock implementation)
    subscribeToOnlinePlayers(callback: () => void): Subscription {
        return {
            unsubscribe: () => console.log('Unsubscribing from online players')
        } as Subscription;
    }

    // Subscribe to match found (mock implementation)
    subscribeToMatchFound(userId: string, callback: (gameId: string) => void): Subscription {
        return {
            unsubscribe: () => console.log('Unsubscribing from match found for user', userId)
        } as Subscription;
    }

    // Update online status (mock implementation)
    async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
        console.log('Updating online status for user', userId, 'to', isOnline);
    }
} 