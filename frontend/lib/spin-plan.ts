/**
 * The twenty-four positions of a 360° set, in the order you walk them.
 *
 * Written down here because it is the same plan in three places: the shooting
 * guide in docs/SPIN_360.md, the labelled slots an administrator uploads into,
 * and the order the frames are stored in. Keeping one list means the slot a
 * photograph goes into is the angle it was taken from — there is no separate
 * step where the two can disagree.
 *
 * Stand in front of the car with its nose at twelve o'clock, then walk
 * clockwise: one step, one photograph, twenty-four times.
 */

export interface SpinSlot {
  /** 0-based, and stored as the frame's `sortOrder`. */
  index: number;
  /** Degrees clockwise from the front of the car. */
  angle: number;
  /** Where to stand. */
  position: string;
  /** What should be in the frame. */
  sees: string;
}

const POSITIONS: { position: string; sees: string }[] = [
  { position: 'Directly in front', sees: 'The front, straight on — grille and headlights' },
  { position: 'Front, edging right', sees: 'The front with the right flank appearing' },
  { position: 'Front, edging right', sees: 'The front turning towards the side' },
  { position: 'Front three-quarter, right', sees: 'The best angle of any car — front and side together' },
  { position: 'Front three-quarter, right', sees: 'Front and side, a step further round' },
  { position: 'Beside the right flank', sees: 'The side coming into full profile' },
  { position: 'Beside the right flank', sees: 'The full side profile — wheels and doors' },
  { position: 'Behind the right flank', sees: 'The side with the rear appearing' },
  { position: 'Behind the right flank', sees: 'Side and rear together' },
  { position: 'Rear three-quarter, right', sees: 'Rear and side — the second best angle' },
  { position: 'Rear three-quarter, right', sees: 'Rear and side, a step further round' },
  { position: 'Behind, edging right', sees: 'The rear turning towards you' },
  { position: 'Directly behind', sees: 'The rear, straight on — lights and tailgate' },
  { position: 'Behind, edging left', sees: 'The rear with the left flank appearing' },
  { position: 'Rear three-quarter, left', sees: 'Rear and left side together' },
  { position: 'Rear three-quarter, left', sees: 'Rear and left side, a step further round' },
  { position: 'Behind the left flank', sees: 'The left side coming round' },
  { position: 'Beside the left flank', sees: 'The left side nearly in profile' },
  { position: 'Beside the left flank', sees: 'The full left profile' },
  { position: 'Front of the left flank', sees: 'The left side with the front appearing' },
  { position: 'Front three-quarter, left', sees: 'Front and left side together' },
  { position: 'Front three-quarter, left', sees: 'Front and left side, closing in' },
  { position: 'Front, edging left', sees: 'The front with the left flank' },
  { position: 'Almost back in front', sees: 'One step short of where you began — not the same as frame 1' },
];

export const SPIN_PLAN: SpinSlot[] = POSITIONS.map((entry, index) => ({
  index,
  angle: index * 15,
  ...entry,
}));

/** Frames a set must have before it reads as rotation rather than a slideshow. */
export const SPIN_MINIMUM = 8;
