/**
 * Pure utility functions for chess board operations
 * These functions handle board coordinates and piece mappings without Angular dependencies
 */

/**
 * Convert row and column to chess notation (e.g., 0,0 -> a8)
 */
export function getSquareNotation(row: number, col: number): string {
    const files = 'abcdefgh';
    const ranks = '87654321'; // reversed because board is displayed from white's perspective
    return files[col] + ranks[row];
}

/**
 * Convert chess notation to row and column (e.g., a8 -> {row: 0, col: 0})
 */
export function notationToCoordinates(notation: string): { row: number; col: number } | null {
    if (notation.length !== 2) return null;

    const files = 'abcdefgh';
    const ranks = '87654321';

    const col = files.indexOf(notation[0]);
    const row = ranks.indexOf(notation[1]);

    if (col === -1 || row === -1) return null;

    return { row, col };
}

/**
 * Check if a square is light or dark
 */
export function isSquareLight(row: number, col: number): boolean {
    return (row + col) % 2 === 0;
}

/**
 * Map chess.js pieces to Unicode symbols
 */
export function getPieceSymbol(piece: any): string {
    if (!piece) return '';

    const pieceMap: { [key: string]: string } = {
        'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', // black pieces
        'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔'  // white pieces
    };

    const pieceKey = piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
    return pieceMap[pieceKey] || piece.type;
}

/**
 * Create a board representation from chess.js FEN
 */
export function createBoardFromFen(chess: any): (string | null)[][] {
    const fen = chess.board();
    return fen.map((row: any[]) =>
        row.map((square: any) => {
            if (!square) return null;
            return getPieceSymbol(square);
        })
    );
}

/**
 * Check if coordinates are within board bounds
 */
export function isValidCoordinate(row: number, col: number): boolean {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

/**
 * Extract destination square from chess move notation
 */
export function extractDestinationSquare(moveNotation: string): string {
    const match = moveNotation.match(/[a-h][1-8]/g);
    return match ? match[match.length - 1] : '';
}
