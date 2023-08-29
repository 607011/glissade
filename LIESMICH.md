# Rutschpartie

**Mini-Game, das von Pokémon Crystal Ice Path inspiriert ist**

Schubse den Pinguin Chilly mit den wenigsten Zügen zum Ziel. Der eisige Boden ist so schlittrig, dass er nur an Hindernissen zum Halt kommt, wenn er erst mal in Fahrt ist. Fällt er in ein Loch hinein, taucht er am anderen wieder auf.

![Level 5](level5.png)

Wenn du so gar nicht weiterweißt, kannst du auf „Help“ drücken, um dir den optimalen Pfad anzeigen zu lassen.

## Editor

Zum Spiel gehört ein Editor, mit dem du bestehende Levels verändern und neue erfinden kannst.

![Editor](editor.png)

Standardmäßig legt „New game“ einen 20 Felder breiten und hohen Level an. Die Größe kannst du über die Eingabefelder darunter ändern.

| Field  | Meaning |
| - | - |
| ![](_raw/marker.png) | Damit kannst du den Weg markieren, den Chilly nehmen soll. Die Marker sind nur eine Gedankenstütze für dich; im Spiel erscheinen sie als normale Eisfläche. |
 | ![](_raw/ice.png) | Es ist Eis, kalt und glatt. So glatt, dass ein darübergleitender Chilly erst dann stoppt, wenn er gegen einen Fels dotzt oder in ein Loch fällt. |
 | ![](_raw/rock.png) | Der harte Fels bremst den schlitternden Chilly abrupt ab 0 ab. |
 | ![](_raw/coin.png) | Wenn du Münzen in einen Level packst, veränderst du ihn damit komplett. Das Einsammeln einer Münze schreibt dem Spielerkonto 5 Punkte gut. |
 | ![](_raw/hole.png) | Anders als im richtigen Leben sind diese Löcher nicht lebensgefährlich. Fällt Chilly in eines hinein, taucht er am anderen sofort wieder auf. Diese Formulierung legt schon nahe, dass es nur genau zwei Löcher (oder keines) in einem Level geben darf. |
| ![](_raw/exit.png) | Der Ausgang. Hierhin mss Chilly manövriert werden. |
| ![](_raw/penguin.png) | Der mutige Chilly. Es kann nur einen geben – pro Level. |
| ![](_raw/empty.png) | Das leere Feld kannst du vorerst ignorieren. |

Die drei Eingabefelder unterhalb der „Thresholds“-Schaltfläche enthalten die Anzahl der Züge, die der Spieler maximal benötigen darf, um drei, zwei oder einen Stern am Level-Ende zu erhalten. Das Feld „Points to earn“ gibt an, wie viel Punkte das Absolvieren des Levels dem Spieler einbringt. Diese Zahl wird mit der Anzahl erhaltener Stern für den endgültigen Level-Score multipliziert. Der in den Editor eingebaute Solver füllt diese drei automatisch mit sinnvollen Werten. Du kannst sie beliebig ändern, bevor du den fertigen Levels in Spiel integrierst.

Um einen Level ins Spiel einzubauen, bedarf es zweier Schritte: Zuerst musst du die Level-Daten per „Copy JSON data to clipboard” in die Zwischenablage kopieren. Von dort aus kannst du sie an der gewünschten Stelle im Array `LEVELS` (siehe [index.js](src/index.js)) einfügen.


## Veröffentlichen

Wenn du mit deinen Levels glücklich bist, kannst du das Spiel auf einen Webserver deiner Wahl kopieren, um es zu veröffentlichen.

Dazu gibt es mehrere Wege. Der erste führt über den Aufruf des Skripts [pack.sh](_bin/pack.sh).


















-----

### Mehr Info

 - Oliver Lau,  Rettet den Pinguin!, c’t 19/2023, S. 56: https://www.heise.de/select/ct/2023/19/2318608564017863443
 - Oliver Lau,  Dreifache Chance, c’t 21/2023, S. 54: https://www.heise.de/select/ct/2023/21/2319407263017212334