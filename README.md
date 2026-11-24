# ABCD-Matrizen

Browser-Tool zum Ausprobieren von ABCD-Matrizen (paraxiale Matrizenoptik). Plan und Konventionen: `PLAN.md`.

**Online:** https://prof-sky.github.io/abcd-matrizen/

**Lokal:** `index.html` doppelklicken – ohne Server, ohne Internet.

**Direktlinks auf Beispiele** (z. B. aus Folien): `index.html#p=2` öffnet Beispiel 3 (Zählung ab 0),
`&s=2` wählt Element 2 aus, `&f=1` blendet die Formeln im Bild ein. Jeder eigene Aufbau steht
automatisch in der URL und kann als Lesezeichen gespeichert werden.

| Nr. | Beispiel |
|---|---|
| 0 | Einzellinse – reelle Abbildung |
| 1 | 2f–2f-Abbildung |
| 2 | Lupe – virtuelles Bild |
| 3 | Glasblock |
| 4 | Brechung an ebener Fläche |
| 5 | Kugelfläche – Glasstab |
| 6 | Dicke Linse |
| 7 | Kepler-Teleskop |
| 8 | Galilei-Teleskop |
| 9 | Mikroskop, unendlich korrigiert |

**Dateien:** `optics.js` (Rechnung, ohne DOM) · `app.js` (Darstellung, Interaktion) · `presets.js` (Beispiele) ·
`style.css` · `test/optics.test.js`

**Tests:** `node --test test/optics.test.js`
