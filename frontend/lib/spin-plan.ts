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

const POSITIONS_EN: Position[] = [
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

const POSITIONS_FR: Position[] = [
  { position: 'Juste devant', sees: 'L’avant, de face — calandre et phares' },
  { position: 'Devant, en glissant vers la droite', sees: 'L’avant, le flanc droit apparaît' },
  { position: 'Devant, en glissant vers la droite', sees: 'L’avant qui pivote vers le côté' },
  { position: 'Trois-quarts avant droit', sees: 'Le meilleur angle — l’avant et le côté ensemble' },
  { position: 'Trois-quarts avant droit', sees: 'Avant et côté, un pas plus loin' },
  { position: 'À côté du flanc droit', sees: 'Le côté qui vient en profil' },
  { position: 'À côté du flanc droit', sees: 'Le profil complet — roues et portes' },
  { position: 'Derrière le flanc droit', sees: 'Le côté, l’arrière apparaît' },
  { position: 'Derrière le flanc droit', sees: 'Le côté et l’arrière ensemble' },
  { position: 'Trois-quarts arrière droit', sees: 'Arrière et côté — le deuxième meilleur angle' },
  { position: 'Trois-quarts arrière droit', sees: 'Arrière et côté, un pas plus loin' },
  { position: 'Derrière, en glissant vers la droite', sees: 'L’arrière qui pivote vers vous' },
  { position: 'Juste derrière', sees: 'L’arrière, de face — feux et hayon' },
  { position: 'Derrière, en glissant vers la gauche', sees: 'L’arrière, le flanc gauche apparaît' },
  { position: 'Trois-quarts arrière gauche', sees: 'Arrière et côté gauche ensemble' },
  { position: 'Trois-quarts arrière gauche', sees: 'Arrière et côté gauche, un pas plus loin' },
  { position: 'Derrière le flanc gauche', sees: 'Le côté gauche qui se découvre' },
  { position: 'À côté du flanc gauche', sees: 'Le côté gauche presque en profil' },
  { position: 'À côté du flanc gauche', sees: 'Le profil gauche complet' },
  { position: 'Devant le flanc gauche', sees: 'Le côté gauche, l’avant apparaît' },
  { position: 'Trois-quarts avant gauche', sees: 'Avant et côté gauche ensemble' },
  { position: 'Trois-quarts avant gauche', sees: 'Avant et côté gauche, en se rapprochant' },
  { position: 'Devant, en glissant vers la gauche', sees: 'L’avant avec le flanc gauche' },
  { position: 'Presque revenu devant', sees: 'Un pas avant le point de départ — ce n’est pas la vue 1' },
];

const POSITIONS_AR: Position[] = [
  { position: 'أمام السيارة مباشرة', sees: 'الواجهة من الأمام — الشبك والمصابيح' },
  { position: 'من الأمام مع الانزياح يمينًا', sees: 'الواجهة ويبدأ الجانب الأيمن بالظهور' },
  { position: 'من الأمام مع الانزياح يمينًا', sees: 'الواجهة وهي تدور نحو الجانب' },
  { position: 'ثلاثة أرباع أمامية يمين', sees: 'أفضل زاوية — الأمام والجانب معًا' },
  { position: 'ثلاثة أرباع أمامية يمين', sees: 'الأمام والجانب، خطوة أبعد' },
  { position: 'بجانب الجهة اليمنى', sees: 'الجانب وهو يقترب من الوضع الجانبي الكامل' },
  { position: 'بجانب الجهة اليمنى', sees: 'الوضع الجانبي الكامل — العجلات والأبواب' },
  { position: 'خلف الجهة اليمنى', sees: 'الجانب ويبدأ الخلف بالظهور' },
  { position: 'خلف الجهة اليمنى', sees: 'الجانب والخلف معًا' },
  { position: 'ثلاثة أرباع خلفية يمين', sees: 'الخلف والجانب — ثاني أفضل زاوية' },
  { position: 'ثلاثة أرباع خلفية يمين', sees: 'الخلف والجانب، خطوة أبعد' },
  { position: 'من الخلف مع الانزياح يمينًا', sees: 'الخلف وهو يدور نحوك' },
  { position: 'خلف السيارة مباشرة', sees: 'الخلف من الوراء — المصابيح والباب الخلفي' },
  { position: 'من الخلف مع الانزياح يسارًا', sees: 'الخلف ويبدأ الجانب الأيسر بالظهور' },
  { position: 'ثلاثة أرباع خلفية يسار', sees: 'الخلف والجانب الأيسر معًا' },
  { position: 'ثلاثة أرباع خلفية يسار', sees: 'الخلف والجانب الأيسر، خطوة أبعد' },
  { position: 'خلف الجهة اليسرى', sees: 'الجانب الأيسر وهو ينكشف' },
  { position: 'بجانب الجهة اليسرى', sees: 'الجانب الأيسر يكاد يكون جانبيًا كاملًا' },
  { position: 'بجانب الجهة اليسرى', sees: 'الوضع الجانبي الأيسر الكامل' },
  { position: 'أمام الجهة اليسرى', sees: 'الجانب الأيسر ويبدأ الأمام بالظهور' },
  { position: 'ثلاثة أرباع أمامية يسار', sees: 'الأمام والجانب الأيسر معًا' },
  { position: 'ثلاثة أرباع أمامية يسار', sees: 'الأمام والجانب الأيسر، مع الاقتراب' },
  { position: 'من الأمام مع الانزياح يسارًا', sees: 'الواجهة مع الجانب الأيسر' },
  { position: 'عدت تقريبًا إلى الأمام', sees: 'خطوة قبل نقطة البداية — وليست الصورة الأولى' },
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
  return (BY_LOCALE[locale] ?? POSITIONS_EN).map((entry, index) => ({
    index,
    angle: index * 15,
    ...entry,
  }));
}

/** The English plan, for anything that only needs the count or the angles. */
export const SPIN_PLAN: SpinSlot[] = spinPlan('en');

/** Frames a set must have before it reads as rotation rather than a slideshow. */
export const SPIN_MINIMUM = 8;
