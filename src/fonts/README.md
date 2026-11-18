# Pixel font

`pixelify-sans-*.woff` are Pixelify Sans by Stefie Justprince
(https://github.com/eifetx/Pixelify-Sans), under the SIL Open Font License 1.1
(`OFL.txt`), modified for ChemEd:

- Pixelify draws its 5 exactly like a capital S, so "25 °C" read as "2S °C".
  Our copy redraws the 5 with a flat top running the digit's full width, a
  straight left stem and the S's lower bowl.
- Pixelify draws its 7 as a wide 1 (a flag at the top left, a straight stem
  down the right), so 17 and 71 were hard to tell apart. Our copy redraws the
  7 with a flat top running the digit's full width, stepping down and left to
  a stem in the middle.
- Nothing else is changed.
- Built by `scripts/redraw-digits.mjs` from static instances at weights 400,
  500, 600 and 700 (Google Fonts' TTFs, or these WOFFs), since the variable
  font can't be edited glyph by glyph as easily.

The licence has no Reserved Font Name, so the font keeps its name; this
note records the change, as the OFL asks.
