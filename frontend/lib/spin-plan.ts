import type { Locale } from './i18n/config';

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

type Position = { position: string; sees: string };

/*
 * Eight stops, not twenty-four.
 *
 * Twenty-four meant walking a full circle holding the camera steady, and a
 * phone in a hand does not hold steady: the height drifted, the distance
 * drifted, the shadow moved, and every one of those showed up as a jolt in the
 * turn. Eight stops are eight photographs somebody can actually take — stand,
 * frame it, shoot, move a step.
 *
 * They are the eight a buyer asks for anyway, and the ones every car listing
 * in the world already uses.
 */
const POSITIONS_EN: Position[] = [
  { position: 'Front', sees: 'The front, straight on — grille and headlights' },
  { position: 'Front right', sees: 'Front and right side together — the best angle of any car' },
  { position: 'Right side', sees: 'The full right profile — wheels and doors' },
  { position: 'Back right', sees: 'Rear and right side together' },
  { position: 'Back', sees: 'The rear, straight on — lights and tailgate' },
  { position: 'Back left', sees: 'Rear and left side together' },
  { position: 'Left side', sees: 'The full left profile — wheels and doors' },
  { position: 'Front left', sees: 'Front and left side together' },
];

const POSITIONS_FR: Position[] = [
  { position: 'Avant', sees: 'L’avant, de face — calandre et phares' },
  { position: 'Avant droit', sees: 'L’avant et le côté droit ensemble — le meilleur angle' },
  { position: 'Côté droit', sees: 'Le profil droit complet — roues et portes' },
  { position: 'Arrière droit', sees: 'L’arrière et le côté droit ensemble' },
  { position: 'Arrière', sees: 'L’arrière, de face — feux et hayon' },
  { position: 'Arrière gauche', sees: 'L’arrière et le côté gauche ensemble' },
  { position: 'Côté gauche', sees: 'Le profil gauche complet — roues et portes' },
  { position: 'Avant gauche', sees: 'L’avant et le côté gauche ensemble' },
];

const POSITIONS_AR: Position[] = [
  { position: 'الأمام', sees: 'الواجهة من الأمام — الشبك والمصابيح' },
  { position: 'الأمام يمين', sees: 'الأمام والجانب الأيمن معًا — أفضل زاوية' },
  { position: 'الجانب الأيمن', sees: 'الوضع الجانبي الأيمن الكامل — العجلات والأبواب' },
  { position: 'الخلف يمين', sees: 'الخلف والجانب الأيمن معًا' },
  { position: 'الخلف', sees: 'الخلف من الوراء — المصابيح والباب الخلفي' },
  { position: 'الخلف يسار', sees: 'الخلف والجانب الأيسر معًا' },
  { position: 'الجانب الأيسر', sees: 'الوضع الجانبي الأيسر الكامل — العجلات والأبواب' },
  { position: 'الأمام يسار', sees: 'الأمام والجانب الأيسر معًا' },
];

const BY_LOCALE: Record<Locale, Position[]> = {
  en: POSITIONS_EN,
  fr: POSITIONS_FR,
  ar: POSITIONS_AR,
};

/**
 * The plan, in the administrator's language.
 *
 * Where to stand and what should be in the frame is instruction, not data — a
 * photographer reading "Front three-quarter, right" in a French interface is
 * being asked to translate as they shoot. The angles are the same list either
 * way; only the words change.
 */
export function spinPlan(locale: Locale): SpinSlot[] {
  const positions = BY_LOCALE[locale] ?? POSITIONS_EN;
  // Derived, so changing the number of stops keeps the angles correct.
  const step = 360 / positions.length;

  return positions.map((entry, index) => ({
    index,
    angle: Math.round(index * step),
    ...entry,
  }));
}

/** The English plan, for anything that only needs the count or the angles. */
export const SPIN_PLAN: SpinSlot[] = spinPlan('en');

/**
 * A set is the whole plan or it is not a turn.
 *
 * With twenty-four stops a partial set still read as rotation; with eight, a
 * missing one is a quarter of the car nobody can see, and the car jumps over
 * the gap. So the bar is every stop filled.
 */
export const SPIN_MINIMUM = POSITIONS_EN.length;
