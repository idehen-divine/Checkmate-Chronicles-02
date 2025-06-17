export interface MatchHistoryItem {
  title: string;
  result: 'Won' | 'Lost';
  opponentId: string;
  opponentName: string;
  eloChange: string;
  date: string;
} 