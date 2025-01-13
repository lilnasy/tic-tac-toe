// Core game types
export type Square = "X" | "O" | null
export type Board = [Square, Square, Square, Square, Square, Square, Square, Square, Square]
export type SquarePosition = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type Line = readonly [SquarePosition, SquarePosition, SquarePosition]
