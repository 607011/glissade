# Rutschpartie

**Mini-Game, das von Pokémon Crystal Ice Path inspiriert ist**

Schubse den Pinguin Chilly mit den wenigsten Zügen zum Ziel. Der eisige Boden ist so schlittrig, dass Chilly nur an Hindernissen zum Halt kommt, wenn er erst mal in Fahrt ist. Fällt er in ein Loch hinein, taucht er am anderen wieder auf.

<img width="472" alt="Level 5" src="https://github.com/607011/glissade/assets/2240271/626dd2d0-bb49-46d2-b8a0-7926ab026978">

Wenn du so gar nicht weiter weißt, kannst du auf „Help“ drücken, um dir den optimalen Pfad anzeigen zu lassen.

<img width="471" alt="Level 5 mit Richtungspfeilen als Navigationshilfe" src="https://github.com/607011/glissade/assets/2240271/ff17e45e-7ecb-401d-b9ff-ff0dceb0f7d0">

## Gameplay

Level 5 zum Beispiel ist ein einfacher Level. Aber wenn du einfach drauflos rutschst, statt vorher über den idealen Weg nachzudenken, kann es schnell passieren, dass du nur zwei von drei Sternen einheimst:

https://github.com/607011/glissade/assets/2240271/9e00c150-b5bb-4559-b994-e9ba596a5cce

## Editor

Zum Spiel gehört ein Editor, mit dem du bestehende Levels verändern und neue erfinden kannst.

<img width="703" alt="Editor" src="https://github.com/607011/glissade/assets/2240271/690213fc-63c9-4913-b9c2-9614f63667cf">

Standardmäßig legt „New game“ einen 20 Felder breiten und hohen Level an. Die Größe kannst du über die Eingabefelder darunter ändern.

| Feldkachel  | Bedeutung |
| - | - |
| ![](_raw/marker.png) | Damit kannst du den Weg markieren, den Chilly nehmen soll. Die Marker sind nur eine Gedankenstütze für dich; im Spiel erscheinen sie als normale Eisfläche. |
 | ![](_raw/ice.png) | Es ist Eis, kalt und glatt. So glatt, dass ein darübergleitender Chilly erst dann stoppt, wenn er gegen einen Fels dotzt oder in ein Loch fällt. |
 | ![](_raw/rock.png) | Der harte Fels bremst den schlitternden Chilly abrupt ab 0 ab. |
 | ![](_raw/coin.png) | Wenn du Münzen in einen Level packst, veränderst du ihn damit komplett. Das Einsammeln einer Münze schreibt dem Spielerkonto 5 Punkte gut. |
 | ![](_raw/hole.png) | Anders als im richtigen Leben sind diese Löcher nicht lebensgefährlich. Fällt Chilly in eines hinein, taucht er am anderen sofort wieder auf. Diese Formulierung legt schon nahe, dass es nur genau zwei Löcher (oder keines) in einem Level geben darf. |
| ![](_raw/exit.png) | Der Ausgang. Hierhin muss Chilly manövriert werden. |
| ![](_raw/penguin.png) | Der mutige Chilly. Es kann nur einen geben – pro Level. |
| ![](_raw/empty.png) | Das leere Feld kannst du vorerst ignorieren. |

Die drei Eingabefelder unterhalb der „Thresholds“-Schaltfläche enthalten die Anzahl der Züge, die der Spieler maximal benötigen darf, um drei, zwei oder einen Stern am Level-Ende zu erhalten. Das Feld „Points to earn“ gibt an, wie viel Punkte das Absolvieren des Levels dem Spieler einbringt. Diese Zahl wird mit der Anzahl erhaltener Sterne für den endgültigen Level-Score multipliziert. Der in den Editor eingebaute Solver füllt diese drei automatisch mit sinnvollen Werten. Du kannst sie beliebig ändern, bevor du den fertigen Levels ins Spiel integrierst.

Um einen Level ins Spiel einzubauen, bedarf es zweier Schritte: Zuerst musst du die Level-Daten per „Copy JSON data to clipboard” in die Zwischenablage kopieren. Von dort aus kannst du sie an der gewünschten Stelle unterhalb von `<script id="levels" type="application/json">` in der Datei [index.html](src/index.html) einfügen.

## Veröffentlichen

Wenn du mit deinen Levels glücklich bist, kannst du das Spiel für die Veröffentlichung paketieren.

Dazu gibt es mehrere Wege. Der erste führt über den Aufruf des Skripts [_bin/pack.sh](_bin/pack.sh). Es legt das Unterverzeichnis „package“ an und kopiert alle für das Spiel benötigten Dateien dort hinein. Diese komprimiert das Skript per 7-Zip und schreibt sie in die Datei rutschpartie.zip.

Diese Dateien kannst du nun auf beliebigem Weg mit anderen teilen, zum Beispiel die Zip-Datei an Freunde mailen oder den Verzeichnisinhalt über deinen Webserver veröffentlichen. Wenn du einen eigenen Webserver hast, wirst du wissen, wie man Dateien dorthin kopiert.

Den zweiten Weg beschreitest du mit dem Skript [_bin/deploy.sh](_bin/deploy.sh). Es legt das Verzeichnis „deploy“ an, kopiert aber nicht einfach alle benötigten Dateien dorthin, sondern „minifiziert“ sie zuvor, sodass sie schneller durch die Leitung rauschen, wenn ein Browser sie vom Webserver abruft. 
Wenn du möchtest, dass das Skript die in deploy enthaltenen Dateien per rsync auf deinen Webserver kopiert, lege eine Datei mit dem Namen .env mit einem Inhalt wie folgendem an:

```bash
REMOTE=your.server.example.org:/var/www/html/rutschpartie
```

Damit kopiert das Skript die Dateien auf den Server mit dem Domain-Namen your.server.example.org in das dortige Verzeichnis /var/www/html/rutschpartie. Das Verzeichnis muss bereits existieren.

## Weitere Skripte

Die im Folgenden beschriebenen Skripte brauchst du nicht zum Veröffentlichen, sondern nur, wenn du Grafiken und Sounds verändern möchtest.

Das Python-Skript [gensprites.py](gensprites.py) verfrachtet alle für das Spiel benötigten Grafiken in ein sogenanntes [Spritesheet](https://en.wikipedia.org/wiki/Texture_atlas). Spritesheets können die Ladezeiten drastisch verkürzen, weil nicht mehr viele kleine Bilder einzeln geladen werden müssen, sondern nur eines, das wie eine Wand aus Kacheln alle Bilder enthält. Welche Grafiken im Spritesheet landen sollen, steht in der Datei sprites.yaml.

Das Spritesheet wird allerdings nicht als PNG-Datei gespeichert, sondern als [Daten-URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs) in der [CSS](https://developer.mozilla.org/en-US/docs/Web/CSS)-Datei [tiles.css](src/tiles.css). Darin landen auch die CSS-Klassen, über die man die Einzelbilder im HTML-Code referenzieren kann. Sie sind nach den ursprünglichen Bilddateien benannt: Ist in sprites.yaml beispielsweise die Datei „penguin.png“ aufgeführt, entsteht in tiles.css dafür ein Eintrag wie `.penguin{background-position:0 -416px}`. Die tatsächliche `background-position` hängt davon ab, welche anderen Bilder sprites.yaml noch enthält.

gensprites.py benötigt das Python-Modul „pyyaml“ zum Verarbeiten von YAML-Dateien sowie „Pillow“ zum Lesen, Bearbeiten und Schreiben von Bilddateien. Du musst die Module nicht per `pip` von Hand installieren: Wenn du das Skript mit `pipenv run ./gensprites.py` startest, werden sie vorher automatisch in ein sogenanntes [Virtualenv](https://pipenv.pypa.io/en/latest/) installiert, um das du dich nicht weiter kümmern musst.

Im Verzeichnis _bin befinden sie noch zwei weitere Skripte: [convert-audio.sh](_bin/convert-audio.sh) wandelt die in src/static/sounds enthaltenen WAV-Dateien mithilfe von [FFmpeg](https://ffmpeg.org/) in die bandbreiten- und browserfreundlicheren Formate MP3, OGG und WebM um. [convert-images.sh](_bin/convert-images.sh) erzeugt Favicons aus der Pinguin-Grafik _raw/penguin.png.

## Trivia

Die Sounds sind mithilfe von [Bfxr](https://www.bfxr.net/) entstanden. Die Grafiken wurden liebevoll von Hand in Affinity Photo gezeichnet.

Chilly ist zu seinem Namen in einem gleichermaßen lustigen wie irritierenden [Gespräch mit ChatGPT](https://chat.openai.com/share/bac5dec0-1a97-4430-8714-938811e16821) gekommen, das einmal mehr zeigt, das KIs zu doof zum Zählen sind – aber auch, dass man sie bei der Ehre packen kann 😉

## Lizenz

Diese Software steht unter der [MIT-Lizenz](LICENSE).

Copyright ©️ 2023 [Oliver Lau](mailto:oliver.lau∀gmail.com)

## Nutzungshinweise

Diese Software wurde zu Lehr- und Demonstrationszwecken geschaffen und ist nicht für den produktiven Einsatz vorgesehen. Heise Medien und der Autor haften daher nicht für Schäden, die aus der Nutzung der Software entstehen, und übernehmen keine Gewähr für ihre Vollständigkeit, Fehlerfreiheit und Eignung für einen bestimmten Zweck.

-----

## Literatur

 - Oliver Lau, Rettet den Pinguin!, [c’t 19/2023, S. 56](https://www.heise.de/select/ct/2023/19/2318608564017863443)
 - Oliver Lau, Dreifache Chance, [c’t 21/2023, S. 54](https://www.heise.de/select/ct/2023/21/2319407263017212334)
 - Oliver Lau,  Gut gebettet, Mit Daten-URLs Bilder und andere Daten in Textdokumente integrieren, [c’t 10/2023, S. 152](https://www.heise.de/select/ct/2023/10/2307509274576696945)
