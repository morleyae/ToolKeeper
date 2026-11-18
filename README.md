# ToolKeeper

ToolKeeper ist ein CEP-Panel für Adobe After Effects im Stil der übrigen Keeper-Erweiterungen.

## Enthaltene Bereiche

- Neue Ebenen: Text, Adjustement, Solid, Null, Shape, Camera, Light und Paste
- Ebenen: Precomp, Precomp each, Decomp, Duplicate, Rename, Sequence, Fit und Invert
- Schlechte Frames: Marker-Suche mit Empfindlichkeit und Auswahlmodus
- Beat-Marker: Markersuche, Snap, Sequenzierung, Schnitt und Sequenzreihenfolge
- Untertitel: Sprach- und Modusauswahl, Wortanzahl, Stilaktionen und Platzhalter-Caption-Erzeugung
- Text teilen: Words, Lines, Letters, Ebenenauswahl, Reihenfolge und Textstil-Einstellungen

## Nachentwicklung

Die Datei `jsx/hostscript.jsx` enthält die direkten AE-Aktionen. Die Panel-Logik liegt in `assets/panel.js`.

Für echte Bild-/Titel-/Phrasen-Erkennung muss ToolKeeper zusätzlich eine lokale oder Cloud-basierte Transkriptionsbibliothek nutzen. Die aktuelle Caption-Aktion erstellt in dieser Version eine verständlich platzierte Caption-Ebene und meldet diesen Status offen an den Benutzer.

## Lokale Vorschau

```bash
cd "/Library/Application Support/Adobe/CEP/extensions/ToolKeeper"
python3 -m http.server 4174
```

Öffnen: `http://localhost:4174`

In einem normalen After Effects-CEP-Panel ist `window.cep` verfügbar und die Aktionen werden per `cep.evalScript` ausgeführt.

## Releases and Updates

ToolKeeper releases are built from version tags. Create and push a semantic version tag such as `v1.0.1`; the GitHub Actions workflow builds `ToolKeeper-v1.0.1.zip`, stamps the CEP manifest and updater configuration with that version, and publishes the ZIP as a GitHub Release asset.

The installed panel checks the latest public GitHub release when it opens. If a newer release is available, it downloads the matching ZIP and starts the platform-specific installer. After installation, click **Finish** to reload the panel. Manual installers are also included in each release ZIP.

For a local development build, `assets/update-config.js` deliberately has `development: true`; release packaging switches this off in the generated ZIP. The version link in the panel opens the [ToolKeeper releases page](https://github.com/morleyae/ToolKeeper/releases).
