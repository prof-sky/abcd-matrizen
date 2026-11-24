# Stand – ABCD-Matrizen (24.11.2026)

## Wo

| | |
|---|---|
| Webseite | https://prof-sky.github.io/abcd-matrizen/ |
| Repo | https://github.com/prof-sky/abcd-matrizen (öffentlich, GitHub Pages aus `main` / root) |
| Lokal | `C:\tools\abcd` |

## Was fertig ist

- **Komponenten:** Freiraum, dünne Linse, ebene Fläche, Kugelfläche, Glasblock und dicke Linse
  (die letzten beiden als Fläche · Strecke · Fläche, Teilmatrizen aufklappbar).
- **Drei Strahlen**, jeder ein-/ausblendbar:
  - Modus „Vom Objekt": Strahl 1 achsparallel und Strahl 2 unter θ, beide vom Objektpunkt (h);
    Strahl 3 vom Achsenpunkt unter u (Randstrahl).
  - Modus „Frei": x und θ je Strahl.
- **Grafik (SVG):** überhöhte x-Achse, F/F′, Objekt- und Bildpfeil, virtuelles Bild gestrichelt,
  Medien eingefärbt. Ziehen von Linsen/Flächen, Objektpunkt und Winkelgriffen; Mausrad ändert f′.
- **„Formeln im Bild":** Matrix je Element plus Strahlvektoren nach dem Element (Kopfzeile `s_k = M_k·s_(k−1)`).
- **Panel Übergang:** Matrix symbolisch / mit Zahlen / Ergebnis, Gleichungen, Rechnung je Strahl,
  Teilschritte, kumuliertes Produkt (MathML).
- **Panel Gesamtsystem:** M, det M, f′ = −1/C bzw. afokal mit Γ = D, Bildlage und β, reell/virtuell,
  Knopf „Schirm ins Bild" (B = 0), Zwischenprodukte, Inverse.
- **10 Beispiele**, Direktlinks `#p=<Nr>` (ab 0), optional `&s=<Element>` und `&f=1`.
  Eigene Aufbauten stehen automatisch in der URL.
- **Tests:** 11 Rechentests, alle grün (`node --test test/optics.test.js`).

## Festlegungen

- Echte Winkel: Freiraum ist immer `(1 d; 0 1)`, das `d/n` entsteht erst beim Glasblock als Produkt.
- Keine Foliennummern im Tool – sie veralten, wenn sich die Folien ändern.
- Gekrümmte Flächen sind schematisch gezeichnet, gerechnet wird exakt.

## Arbeitsweise

- Änderungen: lokal bearbeiten, mit Windows-Git (`C:\Program Files\Git\cmd\git.exe`) committen
  und `git push`; Pages aktualisiert die Seite nach ca. 1 Minute (ggf. Strg+F5).
- Die GitHub-CLI `gh` ist nicht installiert. Repo-Einstellungen (z. B. Pages) daher im Browser.
- Prüfen im Browser: headless Chrome mit `--screenshot`, Konsolenfehler mit `--enable-logging=stderr`.

## Offene Ideen (nicht beauftragt)

- „SVG speichern"-Knopf für Folien
- Spiegel (eben/sphärisch)
- Aufgabenmodus („stelle f′ so ein, dass β = −2")
