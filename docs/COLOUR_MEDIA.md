# Photographs per colour

A colour used to be a swatch and one picture. Choosing Basalt Grey showed one
grey photograph, and then the interior and the wheels of whichever colour had
been photographed first — so the customer was looking at a car that does not
exist.

Every colour now carries its own three sets.

## Where

**Administration › Gérer les voitures › the car › Photos & colours.**

Each colour row has, under the name and the swatch, seven groups:

| | |
|---|---|
| **Outside** | the car in this colour |
| **Inside** | the cabin as it comes with this colour |
| **Wheels** | the wheels fitted to it |
| **Engine** | under the bonnet |
| **Boot** | the load space |
| **Anything else 1** | whatever this car needs — you type the heading |
| **Anything else 2** | a second one, same idea |

Several photographs per group. The single picture above them — "the one picture
the swatch shows" — is what the swatch itself displays; the groups are what the
gallery shows once the colour is chosen.

### The two free groups

For what the fixed groups do not cover: a scratch on the rear bumper, the roof
rails, the spare wheel, a mark on a seat. **Type the heading yourself** — it is
stored with the photographs and shown to the customer over the picture, so
nobody ever reads the word "other".

Both are stored as the `OTHER` kind and told apart by their position (0 and 1),
which is why the two headings never merge into one group.

## What a customer sees

Choosing a colour shows **that colour only**, in the order somebody asks about a
car: outside, inside, wheels, engine, boot, then anything else — that one last
because it is whatever this car needed a slot for, including damage. The picture
cross-fades rather than cutting, and the colour's name appears over it, followed
by the free group's heading when the picture has one.

The **main photograph never appears once a colour is chosen**. It belongs to the
listing card and it is a photograph of one particular colour — showing it beside
a different swatch contradicts the choice just made.

A colour with no photographs of its own falls back to the car's general
photographs, still without the main one. An empty gallery would be worse than a
slightly generic one.

## Filed under the colour's name

A photograph records the **name** of its colour, not an id.

Not a detail: saving a car replaces its colours, so every colour is created
afresh with a new id each time. A photograph holding an id would come back
attached to nothing at all after the first save — and nobody would notice until
a customer chose a colour and saw an empty gallery. The name is the colour's
natural key on a car (`@@unique([carId, kind, name])`), and the backend
re-attaches by name, case-insensitively, after the colours are written.

The consequence worth knowing: **renaming a colour and saving detaches its
photographs.** Rename it, save, then re-upload — or rename it back. The field
says so in the form.

A name matching no colour leaves the photograph attached to the car in general
rather than throwing it away. A typo should cost a photograph its grouping, not
its existence.

## Verified

- 24 frames and three colour groups round-trip through the API in order
- saving twice changes every colour id, and the photographs still find their
  colour
- a mistyped colour name keeps the photograph
- the main photograph does not appear once a colour is chosen
