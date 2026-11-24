# ABCD-Matrizen-Spielwiese – Plan

Browser-Tool zur Vorlesung „Grundlagen der Mikroskopie" (Folien 12–20, Matrizenoptik).
Man baut aus vorgefertigten Komponenten einen Aufbau entlang der optischen Achse, sieht
zwei Strahlen hindurchlaufen und kann an jeder Übergangsstelle die Matrix und die
ausgerechnete Formel ablesen.

## 1. Ziel und Abgrenzung

- **Ziel:** ABCD-Matrizen ausprobieren und verstehen, nicht Optikdesign. Paraxial, 2D, eine Achse.
- **Kein** echtes Raytracing, keine Aberrationen, keine Dispersion, keine Blenden/Vignettierung.
- Läuft per Doppelklick auf `index.html` (auch offline im Hörsaal), ohne Build und ohne Server.

## 2. Konventionen (aus den Folien übernommen)

| Größe | Festlegung |
|---|---|
| Strahlvektor | `s = (x, θ)`, x = Höhe über der Achse in mm, θ = echter Winkel in rad |
| Näherung | paraxial: `tan θ = sin θ = θ` |
| Lichtrichtung | von links nach rechts, z-Achse = optische Achse |
| Reihenfolge | `M = M_k · … · M_2 · M_1` (erstes Element steht rechts) |
| Brennweite | `f' > 0` Sammellinse, `f' < 0` Zerstreuungslinse |
| Radius | `r > 0`, wenn der Krümmungsmittelpunkt rechts der Fläche liegt |

**Eine Unstimmigkeit in den Folien, die das Tool auflösen muss:** Folie 13 nennt für die
Ausbreitung `[[1, L], [0, 1]]`, die Tabelle auf Folie 18 `[[1, d/n], [0, 1]]`. Mit echten
Winkeln (wie bei der ebenen Fläche mit `n1/n2` auf Folie 14) ist die Ausbreitung in jedem
Medium `[[1, d], [0, 1]]`. Das `d/n` entsteht erst als Produkt „Fläche · Strecke · Fläche",
also beim Glasblock als Ganzem. Das Tool rechnet durchgehend mit echten Winkeln; der
Glasblock (Beispiel Folie 17) zeigt das `d/n` dann als Ergebnis der Multiplikation.

## 3. Komponenten (Palette)

| Komponente | Parameter | Matrix | Darstellung |
|---|---|---|---|
| Freiraum | `d` | `[[1, d], [0, 1]]` | Abstand mit Maßpfeil |
| Dünne Linse | `f'` | `[[1, 0], [−1/f', 1]]` | Doppelpfeil (sammelnd) / umgekehrte Pfeilspitzen (zerstreuend), Brennpunkte F, F' markiert |
| Ebene Fläche | `n1 → n2` | `[[1, 0], [0, n1/n2]]` | senkrechte Linie, Medium rechts davon eingefärbt |
| Sphärische Fläche | `r`, `n → n'` | `[[1, 0], [(n−n')/(n'·r), n/n']]` | Kreisbogen, Medium eingefärbt |
| Glasblock (zusammengesetzt) | `d`, `n` | Fläche · Strecke · Fläche | gefülltes Rechteck |
| Dicke Linse (zusammengesetzt) | `r1`, `r2`, `d`, `n` | Kugelfläche · Strecke · Kugelfläche | Linsenquerschnitt |

- Zusammengesetzte Komponenten lassen sich **aufklappen**: dann stehen die drei
  Teilmatrizen einzeln an ihren Flächen, zugeklappt nur das Produkt.
- Das Tool führt den aktuellen Brechungsindex entlang der Kette mit. `n1` einer Fläche ist
  daher vorbelegt (Medium links davon) und nicht frei wählbar; so entstehen keine
  widersprüchlichen Aufbauten.
- Start- und Endebene sind fest vorhanden (Objektebene links, Beobachtungsebene rechts).

## 4. Die Strahlen

Drei Strahlen, jeder per Häkchen ein-/ausblendbar. Zwei Modi:

1. **Vom Objekt (Standard):** Strahl 1 vom Objektpunkt in Höhe `h` achsparallel, Strahl 2 vom
   selben Objektpunkt unter `θ` – ihr Schnittpunkt ist der Bildpunkt. Strahl 3 vom Achsenpunkt
   unter `u` (Randstrahl) – sein Achsdurchgang ist die Bildlage.
2. **Frei:** `x` und `θ` für alle drei Strahlen einzeln (z. B. paralleles Bündel fürs Teleskop).

Startwerte per Zahlenfeld und durch Ziehen des Objektpunkts bzw. der Winkelgriffe in der Grafik.
Ältere Links mit den früheren Modi „Objektpunkt" / „Rand-/Parallelstrahl" öffnen im Modus „Vom Objekt".

## 5. Bildschirmaufbau

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ABCD-Matrizen   [Beispiel ▾]   Strahlen: (•)Objektpunkt ( )Rand/Haupt ( )Frei │
├──────────────────────────────────────────────────────────────────────────────┤
│ Palette:  [+ Freiraum] [+ Linse] [+ ebene Fl.] [+ Kugelfl.] [+ Glasblock] …   │
├──────────────────────────────────────────────────────────────────────────────┤
│  x                                                                            │
│  ↑  Objekt        ⇕ f'1                  ⇕ f'2                 Bild           │
│  │   ↑━━━━━━━━━━━━╋━━━━━━━╲               ║                                    │
│  │   ┃            ║        ╲━━━━━━━━━━━━━━╋━━━━━━━━━━━━━━━━━━━━━┓             │
│  ┼───┸────────────╫──F'────────────────F──╫─────────────────────╂──→ z        │
│  │                ║                       ║                     ↓             │
│      ├──── d1 ────┤├──────── d2 ──────────┤├─────── d3 ─────────┤             │
│      ①            ②                       ③                     ④             │
├──────────────────────────────────────────────────────────────────────────────┤
│ Kette (Karten, Reihenfolge wie im Bild, per Drag umsortierbar):               │
│ ┌─Freiraum──┐ ┌─Linse─────┐ ┌─Freiraum──┐ ┌─Linse─────┐ ┌─Freiraum──┐         │
│ │ d = 100   │ │ f' = 50   │ │ d = 150   │ │ f' = 100  │ │ d = 80    │         │
│ │ (1 100)   │ │ ( 1    0) │ │ (1 150)   │ │ ( 1    0) │ │ (1 80)    │         │
│ │ (0   1)   │ │ (−.02  1) │ │ (0   1)   │ │ (−.01  1) │ │ (0  1)    │         │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘         │
├───────────────────────────────────────┬──────────────────────────────────────┤
│ Übergang ② (angeklickt): Dünne Linse  │ Gesamtsystem                         │
│  x₂ = 1·x₁ + 0·θ₁    = 5.00 mm        │  M = M₅·M₄·M₃·M₂·M₁ = (A B; C D)     │
│  θ₂ = −1/f'·x₁ + θ₁  = −0.100 rad     │  det M = 1.000  (= n_ein/n_aus)      │
│  Strahl 1: (5.00, 0) → (5.00, −0.100) │  f'_ges = −1/C = …   afokal: nein    │
│  Strahl 2: …                          │  Bild bei z = …, β = …, reell        │
└───────────────────────────────────────┴──────────────────────────────────────┘
```

### Grafik (SVG)

- Optische Achse, Komponenten maßstäblich in z; **x ist überhöht** (eigener Maßstab,
  Faktor wird angezeigt), sonst sieht man bei paraxialen Winkeln nichts.
- Zwei Strahlen in zwei festen Farben, als Polylinien `x(z) = x_i + θ_i·(z − z_i)` pro Abschnitt.
- Objekt- und Bildpfeil. Bei virtuellem Bild: gestrichelte Rückverlängerung der Strahlen
  und gestrichelter Bildpfeil (Fall „Lupe", Folie 8).
- Nummerierte Marker ①②③ an jeder Übergangsstelle; Hover hebt Marker, Karte und Strahlpunkte gemeinsam hervor.
- Medien mit `n ≠ 1` leicht eingefärbt.
- Maus: Linse/Fläche horizontal ziehen ändert die benachbarten Abstände; Mausrad auf einer
  Linse ändert `f'`.

### Formeln an den Übergangsstellen

Für die ausgewählte Stelle (Klick auf Marker oder Karte) drei Ebenen, wie auf den Folien:

1. **Symbolisch:** Matrix mit Formelzeichen, z. B. `(1 0; −1/f' 1)`.
2. **Ausgeschrieben:** `x₂ = A·x₁ + B·θ₁`, `θ₂ = C·x₁ + D·θ₁` mit eingesetzten Zahlen.
3. **Je Strahl:** Vektor davor → Vektor danach.

Zusätzlich ein Schalter **„Formeln im Bild"**: blendet direkt an jedem Marker die kleine
2×2-Matrix und die Strahlvektoren ein (für Screenshots/Beamer).

Darstellung der Matrizen mit nativem **MathML** – keine externe Bibliothek, funktioniert offline.

### Gesamtsystem

- Produktkette `M = M_k · … · M_1` mit schrittweise aufklappbaren Zwischenprodukten
  (kumulierte Matrix bis zur jeweiligen Stelle).
- `A, B, C, D` numerisch, `det M` als Kontrolle (`= n_ein/n_aus`).
- Abgeleitete Größen: Systembrennweite `f' = −1/C`; „afokal" bei `C = 0` mit
  Winkelvergrößerung `D` (Teleskop, Folie 19); Abbildungsbedingung `B = 0` an der
  Beobachtungsebene mit `β = A`.
- **Bildlage:** aus dem Schnittpunkt der beiden Strahlen hinter dem letzten Element
  (`z = −(x_a − x_b)/(θ_a − θ_b)`), Angabe reell/virtuell und β. Knopf **„Schirm ins Bild"**
  setzt den letzten Freiraum so, dass `B = 0` wird.
- Inverse `M⁻¹ = (D −B; −C A)` (Strahlumkehr, Folie 20) als ausklappbare Zusatzzeile.

## 6. Beispiele (Preset-Menü)

| Beispiel | Aufbau | Zeigt |
|---|---|---|
| Einzellinse, reelle Abbildung | d – Linse – d | Linsengleichung, `B = 0` |
| 2f–2f | 2f – Linse – 2f | β = −1 |
| Lupe | d < f – Linse – d | virtuelles Bild (Folie 8/9) |
| Glasblock | d – Block – d | Parallelversatz, `d/n` (Folie 17) |
| Kepler-Teleskop | d1 – f'1 – (f'1+f'2) – f'2 – d3 | afokal, `C = 0` |
| Galilei-Teleskop | wie oben mit f'2 < 0 | Folie 19, Lupenbrille Folie 10 |
| Mikroskop (unendlich korrigiert) | f_obj – Objektiv – d – Tubuslinse – f_tub | β = −f_tub/f_obj |
| Dicke Linse | d – dicke Linse – d | Vergleich mit dünner Linse |

## 7. Technik

- **Reines HTML/CSS/JavaScript, keine Abhängigkeiten, kein Build.** Klassische
  `<script>`-Dateien statt ES-Module, weil Module über `file://` nicht laden.
- Dateien:
  - `index.html` – Gerüst
  - `style.css`
  - `optics.js` – reine Rechenlogik ohne DOM: Matrizen, Komponentendefinitionen,
    Strahlverfolgung, Bildlage. Auch in Node ladbar.
  - `app.js` – Zustand, SVG-Zeichnen, Karten, Interaktion
  - `presets.js` – Beispielaufbauten
  - `test/optics.test.js` – Node-Tests (`node --test`)
- **Zustand:** ein Objekt `{ elements: [...], rays: {...}, view: {...} }`; jede Änderung →
  alles neu berechnen und neu zeichnen (die Ketten sind klein, kein Framework nötig).
- **Komponentenregister:** jede Komponente ist ein Eintrag mit `params`, `matrix(p, nIn)`,
  `symbolic(p)`, `nOut(p, nIn)`, `length(p)`, `draw(...)`. Neue Komponenten = ein neuer Eintrag.
- Aufbau wird im URL-Hash gespeichert (Link in die Folien setzen, Zustand übersteht Neuladen).
- Sprache der Oberfläche: Deutsch. Einheiten: mm und rad (Winkel zusätzlich in ° angezeigt).

## 8. Umsetzungsschritte

1. `optics.js` mit Matrizen, Kette, Strahlverfolgung, Bildlage + Tests gegen bekannte Fälle
   (Linsengleichung, 2f–2f, Glasblock `B = d/n`, Teleskopmatrix von Folie 19, `det M`).
2. Statische SVG-Darstellung eines fest verdrahteten Aufbaus mit zwei Strahlen.
3. Karten-Kette mit Parameterfeldern, Hinzufügen/Löschen/Umsortieren.
4. Übergangs-Panel und Gesamtsystem-Panel mit MathML.
5. Presets, Strahlmodi, virtuelles Bild, „Schirm ins Bild".
6. Ziehen in der Grafik, „Formeln im Bild", URL-Hash.
7. Durchsicht im Browser mit allen Presets, auch bei Beamer-Auflösung.

## 9. Offene Punkte (mit Vorschlag)

- **Spiegel** (eben/sphärisch, entfaltet gezeichnet): vorerst weglassen, kommen in den Folien nicht vor.
- **Mehr als drei Strahlen / Bündel:** nein – das hält die Formelanzeige lesbar.
- **Export als Bild (SVG/PNG) für Folien:** einfacher „SVG speichern"-Knopf in Schritt 6, falls gewünscht.
- **Aufgabenmodus** („stelle f' so ein, dass β = −2"): spätere Erweiterung.
