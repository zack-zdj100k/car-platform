# The 360° viewer — trial, and how to remove it

Added on 2026-08-28 as something to try. It is deliberately built so that
removing it is four deletions and two small reverts, and so that nothing else on
the site depends on it.

## What it does

A car that has a frame set gets a **360°** slide at the front of its gallery, on
the car's own page. Drag it to turn the car; arrow keys work too. A car with no
set is exactly as it was.

It is **not** on the cards in the catalogue, on purpose: sixteen cards would mean
several hundred frames on one page, and a horizontal drag inside a small card
fights the reader trying to scroll past it.

## Where the photographs go

**Administration › Gérer les voitures › the car › Photos & media › 360° view.**

Select the whole turn at once. They upload in order, a strip of numbered
thumbnails appears so the order is visible, and saving the car stores them.

- **Order comes from the file names**, compared numerically — so `frame-9`
  sorts before `frame-10`, which plain alphabetical order gets wrong.
- **A new set replaces the old one.** Half of one turn and half of another is
  not a car turning.
- **If any photograph fails to upload the set is not changed at all**, and the
  ones that failed are named. A set with a hole in it makes the car jump at that
  angle, so a broken set is never saved over a working one.
- **At least 8 frames**, 24 ideal. Fewer than 8 is a slideshow, not a rotation.
- **8 MB per photograph** (`MAX_UPLOAD_MB`). A phone at full resolution can
  exceed that; lower the camera's resolution rather than raising the limit —
  twenty-four full-resolution photographs per car is a great deal of disk, and
  the viewer never needs more than about 1200px wide.

## Photographing a car — the shooting plan

Twenty-four photographs, one every 15°, walking clockwise around the car.

**Before the first shot**

- **Park where you can walk all the way round**, with three or four metres of
  space on every side. An empty yard, a quiet car park after hours.
- **Overcast light, or the half hour before sunset.** Direct midday sun puts a
  hard shadow on one flank and blows out the other, and the difference shows as
  the car turns.
- **Turn the wheels straight** and close every door and the boot.
- **Lock the camera.** Turn off flash and HDR, and if the phone allows it lock
  the exposure and focus (press and hold on the car's door). Otherwise the
  brightness shifts from frame to frame and the car appears to pulse.
- **Choose a distance and a height, then keep both.** Hold the phone at chest
  height and let your arm hang the same way for all twenty-four. You walk; your
  arm does not.
- **Keep the car in the middle of the frame** with a little space above the roof
  and below the wheels, so nothing is clipped at any angle.

**The twenty-four positions**

Think of a clock face with the car in the middle and the front of the car
pointing at twelve. Start directly in front and walk clockwise — one step, one
photograph, twenty-four times. Each step is 15°, which is one hour on the clock
face every two shots.

The same plan lives in `frontend/lib/spin-plan.ts`, which is what labels the
upload slots — so the guide and the interface cannot drift apart.

| Frame | Angle | Where you stand | What you see |
|---|---|---|---|
| 01 | 0° | in front | the front, straight on — grille and headlights |
| 02–03 | 15–30° | front, edging right | the front with the right flank appearing |
| 04–05 | 45–60° | front three-quarter, right | **the best angle of any car** — front and side together |
| 06–07 | 75–90° | beside the right flank | the full side profile, wheels and doors |
| 08–09 | 105–120° | behind the right flank | the side with the rear appearing |
| 10–11 | 135–150° | rear three-quarter, right | rear and side together |
| 12–13 | 165–180° | behind | the rear, straight on — lights and tailgate |
| 14–15 | 195–210° | rear three-quarter, left | rear and left side |
| 16–17 | 225–240° | behind the left flank | the left side coming round |
| 18–19 | 255–270° | beside the left flank | the full left profile |
| 20–21 | 285–300° | front three-quarter, left | front and left side together |
| 22–23 | 315–330° | front, edging left | the front with the left flank |
| 24 | 345° | almost back in front | one step short of where you began |

Frame 24 must **not** repeat frame 01 — it sits one step before it, so the turn
closes smoothly instead of pausing on the same picture twice.

**Naming**

Whatever your camera calls them is usually fine: phones number files in the
order the photographs were taken, which is the order you walked. If you rename
them, use `frame-01` … `frame-24` — the numbers are compared numerically, so
`frame-9` correctly comes before `frame-10`.

**Then upload**

Administration › the car › Photos & colours › 360° view.

There are **twenty-four numbered slots**, one per position, each showing its
angle, where to stand and what should be in the frame. Click a slot and choose
that one photograph. The header counts what is filled — "18 of 24 positions
filled" — so a missing angle is visible rather than discovered later as a jump
in the turn.

The slot a photograph goes into **is** the angle it is stored at, so nothing
depends on file names and no set can come back scrambled.

**All at once** is still there for a complete set: it fills the slots in order,
comparing file names numerically so `frame-9` lands before `frame-10`.

A partial set works. Twelve photographs every 30° is a coarser turn, not a
broken one; fewer than eight and the header says so, because below that it reads
as a slideshow.

**A quick check before you leave the car**

Flick through the photographs on the phone. If the car appears to jump sideways
between two of them, you moved closer or further at that point — retake those
two from where the others were taken.

**One turn per car is enough.** A set for every colour is possible later if it
earns its keep, but twenty-four photographs of one colour and good photographs
of the others is the right trade to start with.

## The placeholder set

Until a car has a real set, a bundled placeholder one stands in — that is what
the Jetour X70 Plus shows. Uploading a real set for a car replaces it for that
car; the placeholders are only a fallback so the feature could be judged before
anybody photographed anything.

## Placeholders

`node scripts/make-spin-placeholders.mjs <car-slug> [frames]` writes an abstract
low-poly car turning through 360°, with PLACEHOLDER on every frame. They exist so
the gesture could be judged before anybody photographed anything, and they weigh
96 KB for all twenty-four.

## How it is stored

A frame is a row of `car_images` with `kind = SPIN`, ordered by `sortOrder` —
the same table, upload path and deletion handling as every other photograph. The
enum value was added by `prisma/migrations/20260828182319_add_spin_image_kind`.

The frames are deliberately kept out of the photograph gallery: two dozen
near-identical thumbnails would bury the four pictures a customer wants.

## Still to come, if it stays

A **`360°` badge on the catalogue card**, with two or three frames turning on
hover — enough to say "this one turns, come and look" without putting a full set
on the listing page.

## Removing it

Delete:

- `frontend/components/cars/car-spin.tsx`
- `frontend/components/admin/spin-uploader.tsx`
- `frontend/lib/spin.ts`, `frontend/lib/spin-sets.json`
- `frontend/public/images/spin/`
- `frontend/e2e/car-spin.spec.ts`
- `scripts/make-spin-placeholders.mjs`
- this file

Then revert the small changes in:

- `frontend/components/cars/car-gallery.tsx` — the `spinFrames` prop, the extra
  slide, and the `360°` tab
- `frontend/components/cars/car-detail-view.tsx` — one import, one prop, and the
  line that keeps SPIN out of the photographs
- `frontend/components/admin/car-form.tsx` — the `360° view` section and the two
  views over the image list
- `frontend/components/admin/image-uploader.tsx` — the `Exclude<…, 'SPIN'>` types
- `frontend/lib/i18n/dictionaries.ts` — `car.spinLabel` and `car.spinHint`, in
  all three languages
- `frontend/types/api.ts` — `'SPIN'` in `ImageKind`
- `backend/test/cars.e2e-spec.ts` — the two 360° tests
- `prisma/schema.prisma` — the `SPIN` enum value

`git diff` over those files shows exactly what to take out.

The migration is the one thing not worth reversing: an unused enum value costs
nothing, and removing a value from a Postgres enum means rewriting the type. If
you want it gone anyway, delete any `car_images` rows with `kind = 'SPIN'` first.
