# Widget- und Kategorie-Rechte — Spezifikation

Status: Entwurf, noch nicht implementiert.

## 1. Ziel

Ein Administrator soll pro Widget und pro Kategorie festlegen können, was eine Benutzergruppe
(oder ein einzelner Benutzer) davon zu sehen und zu bedienen bekommt. Leitszenario: eine Ansicht
für Kinder, die nur im eigenen Zimmer steuern dürfen und ausgewählte Werte anderer Räume — etwa
die Außentemperatur — nur ablesen.

### Nicht-Ziele

- **Keine Zugriffssicherung.** Die Regeln wirken ausschließlich in der Darstellung. Versteckte
  Widgets liegen weiterhin im Browser-Payload und lassen sich über die Devtools, `vis`, die
  REST-API oder eine Socket-Konsole erreichen. Wer echte Schreibsperren braucht, muss die ACLs der
  ioBroker-Objekte setzen — das ist bewusst nicht Teil dieser Spezifikation.
- Keine Änderung am Backend (`src/lib/WidgetsManagement.ts`, `src/widget-utils/`).
- Keine Filterung der Kategorie-Kennzahlen (siehe §8).

## 2. Begriffe

| Begriff | Bedeutung |
|---|---|
| Knoten | Ein Widget oder eine Kategorie |
| Subjekt | Eine ioBroker-Gruppe (`system.group.*`) oder ein Benutzer (`system.user.*`) |
| Stufe | `hidden` \| `read` \| `control` |
| Editierrecht | Getrennte, globale Berechtigung zum Konfigurieren (§7) |

## 3. Datenmodell

```ts
export type AclLevel = 'hidden' | 'read' | 'control';

export interface WmAcl {
    /** Fällt für jedes Subjekt, das unten nicht genannt ist */
    default?: AclLevel;
    /** Schlüssel sind vollständige Objekt-IDs: "system.group.kids" */
    groups?: Record<string, AclLevel>;
    /** Schlüssel sind vollständige Objekt-IDs: "system.user.lena" */
    users?: Record<string, AclLevel>;
}
```

Vollständige IDs als Schlüssel, weil `system.group.X.common.members` ebenfalls vollständige IDs
enthält — damit entfällt jede Umrechnung, und ein Benutzer namens `kids` kollidiert nicht mit einer
gleichnamigen Gruppe.

### Ablageorte

| Knoten | Ort |
|---|---|
| Gerät-Widget | `common.custom['devices.0'].acl` am Alias-**Kanal** |
| Kategorie | `common.custom['devices.0'].acl` am Alias-**Ordner** → neues Feld `acl` in `CategorySettings` |
| Custom-Widget | neues Feld `acl` in `CustomWidgetBase` (liegt in den Kategorie-Settings, nicht als Objekt) |

Fehlt `acl`, verhält sich der Knoten wie heute. Es gibt keine Migration.

### Zusätzliche Kategorie-Zuordnung

Für Ausnahmen quer zur Ordnerstruktur (§5) bekommt ein Widget optional weitere Elternkategorien:

```ts
/** Zusätzliche Kategorien, in denen das Widget ebenfalls erscheint (neben `parent`) */
extraParents?: string[];
```

Ablage analog in `custom['devices.0']`. Das Feld ist unabhängig von den Rechten nützlich und wird
im Backend beim Aufbau der Widget-Liste ausgewertet (einziger Backend-Berührungspunkt; kann in
einer späteren Ausbaustufe erfolgen).

## 4. Auflösung

Zwei Dimensionen: Knoten-Spezifität (außen) und Subjekt-Spezifität (innen).

```
resolveLevel(node, userId, groupIds):
    für jeden Knoten der Kette [widget, kategorie, …, elternkategorie, root]:
        acl = knoten.acl
        wenn acl?.users?[userId] gesetzt        -> zurück
        treffer = groupIds.filter(g => acl?.groups?[g] gesetzt)
        wenn treffer nicht leer                 -> permissivsten Treffer zurück
        wenn acl?.default gesetzt               -> zurück
    zurück 'control'
```

Regeln:

1. **Der spezifischste Knoten gewinnt.** Eine Einstellung am Widget schlägt die der Kategorie,
   diese schlägt den Root-Default.
2. **Benutzer schlägt Gruppe** innerhalb desselben Knotens.
3. **Mehrere Gruppen: die permissivste gewinnt** (`control` > `read` > `hidden`). Rechte aus
   Gruppenmitgliedschaften addieren sich.
4. **Ohne jede Regel: `control`** — das heutige Verhalten.

### Containment

Nach der Auflösung der einzelnen Knoten gilt zusätzlich: **Löst eine Elternkategorie zu `hidden`
auf, ist der gesamte Inhalt versteckt**, unabhängig von der Stufe der einzelnen Widgets. Eine
Kategorie, die man nicht sieht, kann man nicht betreten.

**Ausnahme Root.** Die Root-Kategorie ist die Startseite, kein Container, den man betritt — und
`default: 'hidden'` an der Root ist die Whitelist-Redewendung schlechthin. Ihr `hidden` vererbt sich
deshalb nur über die Fallback-Kette (eine Kategorie ohne eigene Regel wird versteckt), überstimmt
aber keine ausdrückliche Regel weiter unten. Ohne diese Ausnahme wäre das Kinder-Beispiel unten
nicht formulierbar: Root `hidden` würde das ausdrücklich freigegebene Kinderzimmer wieder
verstecken. Für alle anderen Kategorien gilt die Containment-Regel unverändert.

Der Ausnahmefall — ein Widget aus einer versteckten Kategorie soll dennoch sichtbar sein — wird
über `extraParents` gelöst: das Widget erscheint zusätzlich in einer für das Subjekt sichtbaren
Kategorie und wird dort nach seiner eigenen Stufe behandelt.

### Beispiel „Kinder"

| Knoten | Regel für `system.group.kids` |
|---|---|
| Root | `default: 'hidden'` |
| Kategorie `alias.0.Kinderzimmer` | `groups: { 'system.group.kids': 'control' }` |
| Widget `alias.0.Weather.Temperatur` | `groups: { 'system.group.kids': 'read' }`, `extraParents: ['alias.0.Kinderzimmer']` |

Ergebnis: Das Kind sieht genau eine Kategorie, darin alle eigenen Geräte bedienbar und die
Außentemperatur als Anzeige.

## 5. Verhalten je Stufe

### `control`

Unverändert.

### `read`

Sichtbar, alle schreibenden Interaktionen unterbunden:

- `hasTileAction()` liefert `false`, `onTileClick()` wird nicht verdrahtet
- Slider, Schalter, Buttons, Arc-Knöpfe: `disabled`, keine Pointer-Handler
- Schreibende Dialoge werden nicht geöffnet: Thermostat, AirCondition, ColorLight, Slider-Modus,
  PinPad, ConfirmDialog
- Drag & Drop, Reihenfolge, Favoriten-Stern, Zahnrad, Löschen: nicht gerendert
- **Erlaubt:** Chart-Dialog, Info-Dialog („i"), Min/Max, Trend, alle reinen Anzeigen

### `hidden`

Das Widget wird nicht gerendert und nicht als Kachel-Platzhalter ausgegeben. Eine versteckte
Kategorie erscheint weder in der Kategorieliste noch in der Navigation.

### Umsetzungshinweis

Ein React-Context (`AclContext`) transportiert `{ level, canEdit }` bis in die Widgets, statt die
Stufe durch alle Render-Pfade zu reichen. `WidgetGeneric` liest ihn einmal und leitet daraus
`hasTileAction()`, `renderSettingsButton()` und die Dialog-Öffner ab — damit greift `read`
automatisch auch in allen abgeleiteten Widgets, ohne dass jedes einzeln angepasst werden muss.
Widgets mit eigenen Layouts (Slider, Thermostat, AirCondition, Blind, ColorLight, Volume, Tank,
Universal) brauchen zusätzlich ein `disabled` an ihren Eingabeelementen.

**Plugin-Widgets** (Module Federation) führen fremden Adaptercode aus; `read` lässt sich darin
nicht erzwingen. Sie werden bei `read` wie `hidden` behandelt, und der Rechte-Tab weist darauf hin.

## 6. Nicht betroffen: Kategorie-Kennzahlen

Die Badges im Kategoriekopf und in den Kategoriezeilen (Temperatur, Feuchte, Leistung, offene
Fenster) rechnen weiterhin über **alle** Geräte des Raums, auch über versteckte.

Das ist eine bewusste Festlegung, keine Nachlässigkeit: `Category.subscribeCategoryStatus()`
aggregiert aus `this.props.widgets`, und da das Backend nichts filtert, stehen dort alle Geräte zur
Verfügung. Würde man versteckte Widgets aus der Aggregation nehmen, zeigten Raumwerte stillschweigend
falsche Summen und Mittelwerte.

> **Regel:** Rechte betreffen die Darstellung einzelner Widgets, nicht die Aggregation.

## 6a. Hauptschalter

Das gesamte Konzept hängt an einem einzigen Schalter auf der Root-Kategorie:

```ts
// CategorySettings, nur Root
multiUser?: boolean;
```

Solange er aus ist — und das ist der Auslieferungszustand —

- erscheint in keinem Dialog ein Rechte-Tab,
- fehlt der „Ansicht als …"-Selektor,
- liefert der Resolver `ALLOW_ALL`, gespeicherte Regeln bleiben also wirkungslos,
- verhält sich die Oberfläche exakt wie vor der Einführung.

Eine Einzelbenutzer-Installation bekommt das Konzept damit nie zu Gesicht. Der Schalter selbst
steht im Einstellungen-Tab der Root-Kategorie; wird er dort umgelegt, erscheint der Rechte-Tab
sofort, noch vor dem Speichern.

## 7. Editierrecht

Getrennt vom Sichtmodell und **nur global** in den Root-Einstellungen:

```ts
// CategorySettings, nur für die Root-Kategorie ausgewertet
editors?: {
    groups: string[];   // vollständige IDs
    users: string[];
};
```

- Nicht gesetzt oder leer → nur `system.user.admin`.
- Wer nicht berechtigt ist, bekommt keinen Konfig-Umschalter, keine Zahnräder, kein Drag & Drop,
  kein „Widget hinzufügen", keine Kategorie-Einstellungen.
- Im Admin-Tab (`stateContext.admin === true`) gilt unverändert Vollzugriff.

`CategorySettings.hideConfigButton` wird dadurch überflüssig und sollte in derselben Ausbaustufe
entfallen — es ist heute rein kosmetisch und über `localStorage` umgehbar.

## 8. Benutzer und Gruppen ermitteln

Client-seitig:

1. `socket.getCurrentUser()` → `system.user.<name>`
2. `socket.getObjectView('system', 'group', …)` → alle Gruppen, deren `common.members` die
   Benutzer-ID enthält

**Vor der Umsetzung zu verifizieren:** ob ein nicht-administrativer Web-Benutzer die
`system.group.*`-Objekte lesen darf. Falls nicht, braucht es doch einen kleinen Backend-Endpunkt
`dm:whoami`, der Benutzer und aufgelöste Gruppen zurückgibt — dann allerdings mit der bekannten
Einschränkung, dass `ioBroker.Message` keinen authentifizierten Benutzer trägt und die Angabe des
Clients nicht überprüfbar ist. Für eine reine Ansichtssteuerung ist das vertretbar.

**Ohne Authentifizierung** an der `web`-Instanz ist jeder Besucher `system.user.admin`. Der
Rechte-Tab zeigt in diesem Fall einen Hinweis, dass die Regeln wirkungslos bleiben, statt eine
Wirkung vorzutäuschen.

## 9. Oberfläche

### Widget-Dialog (`WidgetSettingsDialog.tsx`)

`<Tabs>` über dem bisherigen Inhalt:

- **Einstellungen** — das heutige JsonConfig-Panel, der History-Schalter, die Gruppenauswahl
- **Rechte** — `AclEditor`

### Kategorie-Dialog (`CategorySettingsDialog.tsx`)

Ebenfalls zwei Tabs; der Dialog ist mit Name, Farbe, Bild, Theme und Raumwert-Quellen ohnehin am
Limit. In der Root-Kategorie kommt ein dritter Tab **Zugriff** hinzu: die `editors`-Liste und eine
Übersichtsmatrix (Zeilen = Kategorien und Widgets, Spalten = Gruppen) zum Massenbearbeiten. Diese
Matrix ist der Ort, an dem eine Kinder-Ansicht in einem Durchgang entsteht, statt in dreißig
Einzeldialogen.

### `AclEditor` (neue Komponente)

```
Standard                       [ Verstecken | Nur lesen | Steuern ]
─────────────────────────────────────────────────────────────────
Gruppe: Kinder                 [ Verstecken | Nur lesen | Steuern ]  🗑
Gruppe: Gäste                  [ Verstecken | Nur lesen | Steuern ]  🗑
Benutzer: lena                 [ Verstecken | Nur lesen | Steuern ]  🗑
  + Gruppe oder Benutzer hinzufügen
```

Kein JsonConfig — der Editor muss Gruppen- und Benutzerlisten laden und Zeilen dynamisch verwalten.
Unter der Überschrift steht ein Satz, dass es sich um eine Ansichts- und keine Zugriffssteuerung
handelt.

### Vorschau

Im Konfig-Modus ein Auswahlfeld „Ansicht als …" (Gruppe oder Benutzer). Setzt lokal ein Override
für die Auflösung; rein clientseitig, keine Persistenz. Ohne diese Vorschau ist eine Konfiguration
praktisch nicht prüfbar.

## 10. Berührte Dateien

| Datei | Änderung |
|---|---|
| `WidgetsManager/acl.ts` *(neu)* | Typen, `resolveLevel()`, `resolveEditRight()` |
| `WidgetsManager/AclContext.ts` *(neu)* | React-Context |
| `WidgetsManager/AclEditor.tsx` *(neu)* | Editor-Komponente |
| `CategorySettingsDialog.tsx` | `acl`, `editors` in `CategorySettings`; Tabs |
| `WidgetSettingsDialog.tsx` | Tabs, Rechte-Tab |
| `CategoryList.tsx` | Benutzer/Gruppen laden, Context bereitstellen, Konfig-Modus gaten |
| `Category.tsx` | Kategorien und Widgets nach Stufe filtern, Konfig-Affordanzen gaten |
| `Widgets/Generic.tsx` | Context auswerten in `hasTileAction()`, `renderSettingsButton()`, Dialog-Öffnern |
| Widgets mit eigenem Layout | `disabled` an Eingabeelementen |
| `packages/dm-widgets/src/types.ts` | `acl`, `extraParents` in `WidgetSettingsBase` / `CustomWidgetBase` |
| `WidgetsManager/i18n/*.json` | neue Schlüssel, 11 Sprachen |
| `src/lib/WidgetsManagement.ts` | *nur für `extraParents`*, sonst unverändert |

## 11. Umsetzungsschritte

1. ~~Datenmodell, `resolveLevel()`, Unit-Tests der Auflösung~~ — erledigt (`acl.ts`, `test/acl.test.js`)
2. ~~Context, Anwendung in `Category` und `WidgetGeneric`~~ — erledigt; `read` wirkt über den
   gemeinsamen Schreibpfad `WidgetGeneric.setValue()`
3. ~~`AclEditor`, Tabs in beiden Dialogen~~ — erledigt
4. ~~Editierrecht und Root-Zugriffsbereich, `hideConfigButton` entfernt~~ — erledigt
5. ~~„Ansicht als …"~~ — erledigt (`ViewAsSelect.tsx`)
6. ~~Übersichtsmatrix~~ — erledigt (`AclMatrixDialog.tsx`, aus dem Root-Rechte-Tab)
7. ~~`extraParents`~~ — erledigt, rein im Frontend: `Category.widgets` wertet das Feld aus, das
   Backend bleibt unangetastet (ein Widget bleibt eine Entität, es wird nicht dupliziert)
8. ~~Sichtbarer Read-only-Zustand~~ — erledigt: Schloss-Indikator, gedimmte Kachel ohne
   Druck-Animation, `disabled` an allen Slidern

Nach Schritt 5 ist das Leitszenario vollständig bedienbar und überprüfbar.

## 12. Offene Punkte

- Lesbarkeit von `system.group.*` für Nicht-Admins (§8) — entscheidet über `dm:whoami`
- Sollen `hidden`-Kategorien auch aus der Kategorie-Auswahl im Verschieben-Dialog verschwinden?
  (Vorschlag: ja, für Nicht-Editoren ist der Dialog ohnehin nicht erreichbar)
- Verhalten der Favoriten-Kategorie: Regeln greifen am Ziel-Widget, nicht am Container — die
  Favoritenliste eines Subjekts kann dadurch leer sein. Dann ausblenden oder leer anzeigen?
