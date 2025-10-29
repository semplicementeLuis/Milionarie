
export const PRIZE_AMOUNTS: string[] = [
  "€100",
  "€200",
  "€300",
  "€500",
  "€1.000", // Safe point
  "€2.000",
  "€4.000",
  "€8.000",
  "€16.000",
  "€32.000", // Safe point
  "€64.000",
  "€125.000",
  "€250.000",
  "€500.000",
  "€1.000.000",
].reverse();

export const SAFE_LEVELS: number[] = [4, 9]; // Corresponds to indices from the top (0-indexed) of the reversed PRIZE_AMOUNTS array
