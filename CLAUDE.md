# CLAUDE.md – Hinterhof-Abenteuer

Kinder-Spiel im Stil eines digitalen Puppenhauses: Figuren und Gegenstände auf einer
Spielwiese antippen und herumziehen. Kein Gewinnen, kein Verlieren, kein Text im Spiel.

## Stack
- TypeScript + Vite, Phaser 3, Capacitor (Android)
- `npm run dev` für den Browser, `npm run build` muss fehlerfrei durchlaufen (inkl. `tsc`)
- Android-Projekt in `android/` (eingecheckt). APK und Web-Vorschau baut `.github/workflows/android.yml`
  bei jedem Merge auf `main` (Release `v0.<run_number>`, fester Signaturschlüssel aus Repo-Secrets,
  README „APK aufs Tablet“). Pull Requests bauen nur ein Debug-APK zur Probe.

## Konventionen
- Feste Auflösung 1920×1080 (`GAME_WIDTH`), Querformat. Die Welt ist breiter (`WORLD_WIDTH`,
  3 Bildschirme) und scrollt waagerecht (`src/world/CameraControl.ts`, `scene.cameraControl`).
  Nach oben geht es nur mit der Rakete (#75): `cameraControl.follow(obj)` hält etwas Fliegendes im Bild
  (bis `ALTITUDE_MAX`, y negativ), `cameraControl.altitude` = Höhe; ohne Ziel sinkt die Kamera zurück.
  Hintergrund-Ebenen mit Parallaxe scrollen darum senkrecht voll mit (`setScrollFactor(p, 1)`).
- **Welt- vs. Bildschirm-Koordinaten:** Objekte auf der Wiese leben in Weltkoordinaten; Grenzen
  (Bande, Klemmen) benutzen `WORLD_WIDTH`. Zeiger für Welt-Prüfungen immer über
  `scene.worldPoint(pointer)`, nie `pointer.x`. Fest stehende Dinge (Himmel, Sonne/Mond, Sterne,
  Einfärbung, Regen/Schnee/Blätter, Spielzeugkiste, Leisten) haben `setScrollFactor(0)` und
  rechnen in Bildschirmkoordinaten (`GAME_WIDTH`); Wolken `CLOUD_PARALLAX`. „Zur Bildmitte“
  heißt: `cameras.main.worldView.centerX`.
- Ziehen: Die Szene führt jedes gezogene Objekt selbst nach (`beginDrag`/`followDrag`/`endDrag`,
  Versatz zum Finger bleibt). Neue Arten, etwas zu ziehen (z. B. aus einer Leiste), müssen sich dort
  anmelden, sonst folgen sie beim Scrollen am Bildschirmrand (`EDGE_SCROLL_ZONE`) nicht dem Finger.
  Die Wurfgeschwindigkeit misst die Fingerbewegung auf dem Bildschirm (Mitscrollen ist kein Wurf).
- Position eines Objekts = Fußpunkt (Origin 0.5, 1).
- Tiefe = y-Koordinate (weiter unten = weiter vorne). Gezogene Objekte: `DEPTH_DRAGGING`.
- Tageszeit (`src/world/DayCycle.ts`): Die ganze Szene wird über ein Rechteck mit
  Multiplizieren-Blend auf `DEPTH_TINT` eingefärbt, alles liegt darunter – auch gezogene
  Objekte (`DEPTH_DRAGGING` < `DEPTH_TINT`). Was leuchten soll (Mond, Sterne, Lichterkette,
  Taschenlampe), meldet sich bei der **Lichtebene** an (`scene.lightLayer.add({ objects, depth, active })`,
  `src/world/LightLayer.ts`): Sie zeichnet die Lichter über der Einfärbung (`DEPTH_LIGHTS`) und
  radiert pixelgenau aus, was auf der Welt davor steht (Tiefe größer als `depth()`). Lichter nie
  direkt auf `DEPTH_LIGHTS` legen, sonst scheinen sie durch Kinder hindurch (#52). Himmel, Sonne, Mond und Wolken
  zeichnet der DayCycle. Hintergrund-Ebenen mit Parallaxe verdecken Lichter nur mit `setData('occludesLight', true)`.
- **Hintergrund** (`src/world/Backdrop.ts`, #63): der echte Hinterhof. Aufstellung in `src/data/backdrop.ts`, Zeichnungen in
  `src/scenes/placeholders/backdrop.ts`. Ebenen: Häuser (`HOUSE_PARALLAX` 0,3) → Bäume hinter dem Zaun
  (`BACK_TREE_PARALLAX` 0,6) → Zaun mit Pergola und Efeu, Büsche → Wiese. Alles wird einmal in Texturen
  vorgezeichnet (Zaun und Wiese in Kacheln von Bildschirmbreite: `fence-<i>`, `meadow-<i>`; Pergola nur, wo sie
  steht: `pergola-<i>`), nie jedes Bild neu. Nachts gehen Fenster einzeln an (Lichtebene), abends glüht der Backstein
  (`dayCycle.brickGlow`), bei Schnee liegt Schnee auf Dächern und Zaun (`<key>-snow`) und es raucht aus
  Schornsteinen, bei Wind wiegen sich Bäume und Büsche. Der große Laubbaum links ist das Spielgerät `tree`.
- **Felix' Garten** (`src/world/FelixGarden.ts`, `scene.felixGarden`, #64) ganz rechts: Pergola mit wildem Wein,
  Grill, Holzbrüstung, Schuppen, Baumstamm, Mulchboden (ab `FELIX_GARDEN.mulchFrom`), Maße in `FELIX_GARDEN`
  (`src/data/backdrop.ts`), Zeichnungen in `src/scenes/placeholders/garden.ts`. Die warmweiße Lichterkette hängt
  nur hier (Antippen = an/aus, tagsüber gedimmt, Weltzustand `fairyLights`). Der Grill ist Deko; das grüne
  Tor (`src/objects/FelixGate.ts`) öffnet das Grill-Spiel.
- **Grill-Spiel** (#66, `src/scenes/GrillScene.ts`, `scene.openGrill()`): Die Wiese schläft, am Grill stehen die Kinder
  von der Wiese (mindestens zwei, mit Verkleidung). Grillgut, Garzeiten und Bestellungen in `src/data/grill.ts`
  (eine Garstufe je Stück in Vielfachen der Garzeit, **kein Wenden**: gar ab 1,0, verkohlt ab 2,5, `stageOf` → 5 Bildstufen
  `food-<id>-<stufe>`, die nächste blendet weich ein), Zeichnungen in `src/scenes/placeholders/grill.ts` (Aufteilung in
  `GRILL`, Grillgut um `FOOD_SCALE` vergrößert). Gerichte liegen frei auf dem Teller (Versatz zur Tellermitte), Brötchen
  auf dem Teller antippen = aufschneiden. Soßenflasche hochheben = dreht sich um; über dem Essen kommen Kleckse heraus
  (Punkte je Gericht, zählt ab `SAUCE_MIN`), das karierte Tuch wischt sie weg. Teller zum Kind = servieren (roh/verbrannt →
  `kid.yuck()` und neue Bestellung, falsch → `kid.shakeHead()`, richtig → freuen, hinten wieder anstellen).
  Eigene Eingabe (Finger je Zeiger), Töne gehen an die Wiese. Blick aus Felix' Garten auf die Wiese; das
  Holzschild mit Pfeil am Baum links führt zurück.
- **Steinterrasse mit Straßenmalkreide** (`src/scenes/ChalkScene.ts`, `scene.openChalk()`): Graues Tor mit hellblauer Tür im
  Zaun (`TerraceGate`, Position `TERRACE_GATE` in `src/data/chalk.ts`, Lücke in den Büschen) öffnet das Malspiel; die Wiese
  schläft solange. Steinplatten von oben, Kreideschachtel mit 9 Farben (`CHALK_COLORS`, die letzte ist Regenbogenkreide),
  Stück antippen = Farbe, mit Fingern (auch mehreren) malen (Tupfer `chalk-dot` eingefärbt auf eine RenderTexture),
  Schwamm aus dem Eimer = wegwischen, Holzschild oben links = zurück. Zeichnungen in `src/scenes/placeholders/chalk.ts`.
  Das Bild wird beim Verlassen als WebP in einem eigenen localStorage-Eintrag gespeichert (`src/save/chalk.ts`, nicht im
  AutoSave – zu groß für den 250-ms-Vergleich) und beim nächsten Besuch weitergemalt.
- **Strom-Werkstatt** (`src/scenes/CircuitScene.ts`, `scene.openCircuit()`): Spielzeug `circuitkit` (Elektro-Baukasten, Baustein
  `circuit`) antippen öffnet das Spiel; die Wiese schläft solange. Lochplatte mit Batterie, Kippschaltern (mit Pflaster: klemmt),
  Logikgattern UND/ODER/NICHT (Bildzeichen statt Text) und Lampe mit Gesicht. Drähte von Anschluss zu Anschluss ziehen
  (Ausgang = voller Stecker, Eingang = Buchse; je Anschluss ein Draht, Draht antippen = ab), Gatter aus der Ablage auf den
  gestrichelten Platz ziehen. Strom: Drähte leuchten gelb mit Funken; ein Gatter mit offenem Eingang gibt nichts aus (NICHT
  braucht einen angeschlossenen Eingang). 5 Level in `src/data/circuit.ts` (`LEVELS`: Teile, feste Drähte, Ablage), geschafft =
  Lampe leuchtet; oben ein Lämpchen je Level (antippen = Level wählen). Geschaffte Level: Weltzustand `circuit`.
  Zeichnungen in `src/scenes/placeholders/circuit.ts`.
- **Snackbox** (`src/scenes/SnackScene.ts`, `scene.openSnack(kid)`, `src/data/snacks.ts`): Spielzeug `snackbox` (Bausteine `handheld`,
  `snackbox`): Hält ein Kind sie und wird angetippt (`onUse`), öffnet sich das Zahlenspiel; die Wiese schläft solange. Zwei Kinder
  (das haltende + ein weiteres) halten Karten mit Zahl + Snack hoch (ab Runde 2 oft verschiedene Früchte: je Art genau so viele auf den Teller, `needed()`); aus den vier Fächern der Box zieht man so viele Snacks auf den
  Teller, wie beide Zahlen zusammen ergeben (Addition, Summe ≤ 10, mit den Runden wachsend: `maxNumber`). Stimmt die Menge, jubeln die
  Kinder, die Rechnung erscheint (Ziffern und Zeichen sind wie beim Whirlpool die bewusste Ausnahme von „kein Text“) und jedes Kind
  bekommt seine Snacks. Falscher Snack oder zu viele: Kopfschütteln, Snack vom Teller ziehen = zurück in die Box. Zeichnungen in
  `src/scenes/placeholders/snack.ts`.
- **Rakete und Weltall** (#75): Spielzeug `rocket` (Baustein `rocket`, `src/objects/toys/behaviors/rocket.ts`) mit
  4 Plätzen (Kinder verkleinert in der Kabine, Modus `riding`, Tätigkeit `rocket` mit `float`). Ziehen steuert nur
  (Hook `onSteer`: das Spielzeug fliegt selbst zum Finger, `Toy.handleDrag` setzt es dann nicht), die Spitze zeigt dabei
  in Flugrichtung (`toy.spin`, im Flug runde Touch-Fläche). Loslassen = sinkt, richtet sich auf
  (`ROCKET` in `src/data/space.ts`), landet auf der Linie, wo es gestartet ist. Der Himmel darüber
  (`src/world/Space.ts`, `scene.space`): dunkler (`dayCycle.setSpace`), Wolkenschicht `CLOUD_LAYER` (Regen/Schnee
  darüber aus: `weather.setHighUp`), Weltall mit Sternen, Sternschnuppen, Planeten und Ufo (`SPACE_BODIES`,
  Parallaxe `PLANET_PARALLAX`), Zeichnungen in `src/scenes/placeholders/space.ts`. Bewegt sich die Kamera,
  setzt die Szene gezogene Objekte neu unter den Finger.
- **Bunker** (`src/objects/Bunker.ts`, `scene.bunker`): Ein Kind mit Schaufel (Baustein `dig`), weit links im Gras
  abgestellt (`BUNKER.zone` in `src/data/bunker.ts`), buddelt (Tätigkeit `dig` mit `scoop`, Loch und Erdhaufen wachsen)
  und findet eine Stahlluke mit Handrad (Zeichnungen `src/scenes/placeholders/bunker.ts`). Es gibt nur eine Luke;
  jedes weitere Loch schüttet sich wieder zu. Antippen = Handrad dreht, Luke klappert (bleibt zu – die Unterwelt
  dahinter kommt später). Weltzustand `bunker` (`{ x, y, dir }`). Auslöser: `releaseKid` → `bunker.onKidLanded(kid)`.
- **Kinderschminken** (`src/scenes/MakeupScene.ts`, `scene.openMakeup(guest)`, Daten `src/data/makeup.ts`, Zeichnungen
  `src/scenes/placeholders/makeup.ts`): Spielzeug `makeupcase` (Bausteine `makeup` **vor** `handheld`, Tag `makeup`). Hält ein Kind den
  Koffer und man zieht ein anderes Kind darauf (oder auf das haltende Kind: `releaseKid`), öffnet sich das Spiel; die Wiese schläft.
  Man sieht nur den großen Kopf des Gastes (Textur `kid-<id>-head`, Gesichtsoval `FACE`) und zieht Werkzeuge aus dem Regal: 8 Stifte,
  4 Puder (Quaste), 6 Glitzerdosen (eine bunt), Schwamm (wischt alles weg). Gemalt wird in eine Zeichenfläche (RenderTexture, auf das
  Gesicht maskiert). Der Handspiegel unten rechts ist „fertig“.
  **Glitzertattoos** (Umschalter unten Mitte: Gesicht/Arm): Arm des Kindes quer im Bild, Vorlagenbogen links mit 9 Formen
  (Fantasie, Essen, Tiere; `SHAPES` in `data/makeup.ts`). Form auf den Arm ziehen = Schablone (Textur `mk-stencil-<id>`, Form
  ausgestanzt), Kleber aus dem Topf (nur innerhalb der Form), Glitzer bleibt nur auf Kleber haften; ist beides genug da
  (`TATTOO`), zeigt sich eine Ecke zum Abziehen. Schablone abziehen = nur die Tattoo-Form bleibt. Schwamm wischt Tattoos weg.
  **Gespeichert** (#88, #89) wird beim Spiegel: Gesichtsfläche und jedes fertige Tattoo als WebP je Kind im eigenen
  localStorage-Eintrag (`src/save/makeup.ts`, nicht im AutoSave), dazu die Glitzer-Stellen (funkeln beim nächsten Mal wieder).
  Auf der Wiese verwaltet `KidMakeup` (`src/world/KidMakeup.ts`, `scene.makeup`) daraus Canvas-Texturen im Format der Körperteile:
  `makeup-face-<id>` (Kopf) und `makeup-arm-<id>` (rechter Arm, Unterarm um 90° gedreht, `MAKEUP_DECAL`). Jedes `Kid` legt sie
  beim Erschaffen selbst als Auflage auf (auch in Grill, Snackbox, Ankleide …), `kid.refreshMakeup()` nach Änderungen.
  Die Schminke bleibt (auch nach dem Heimgehen), bis man sie im Schminkspiel mit dem Schwamm wegwischt; wieder geöffnet wird
  weitergeschminkt.
- **Zaubertrank** (`src/scenes/BrewScene.ts`, `scene.openBrew(bucket)`, Daten `src/data/brew.ts`, Zeichnungen `src/scenes/placeholders/brew.ts`):
  Eimer (`bucket`, Baustein `brew`) am Boden antippen (oder das Kind mit Eimer) öffnet das Spiel; die Wiese schläft. Korb mit 12 Zutaten
  (`INGREDIENTS`, beliebig oft nehmen), in den Eimer ziehen: der Trank mischt die Farben (`mixColor`). Mit dem Finger Kreise um den Eimer
  = rühren (Winkelsumme, `BREW.turns` Umdrehungen), dann steigt eine Fee auf (`pickFairy`: höchste Punkte, bei Gleichstand oder
  ≥ `BREW.mixedKinds` Sorten die Regenbogenfee). 8 Feen (`FAIRIES`). Zurück schwebt sie als `Fairy` (`src/objects/Fairy.ts`) neben dem
  Eimer auf der Wiese, höchstens `MAX_FAIRIES` (die älteste geht mit Glitzer), gespeichert als Weltzustand `fairies`; Antippen = wirbelt. Nachts leuchtet sie (Lichtebene: Schein + helles Abbild, `dayCycle.darkness`).
- **Tischtennis / Pong** (#90, `src/scenes/PongScene.ts`, `scene.openPong(table)`, Daten `src/data/pong.ts`, Zeichnungen
  `src/scenes/placeholders/pong.ts`): Spielzeug `pingpong` (groß, Baustein `pong`) antippen öffnet das Spiel; die Wiese schläft.
  Platte von oben, an den Enden die zwei Kinder, die der Platte am nächsten sind (wer links steht, spielt links), mit Schläger.
  Beim Start zwei große Knöpfe mit Porträts: 1P (das linke Kind) oder 2P (beide); klein unten jederzeit umschaltbar. Finger hoch/runter
  = Schläger (1P: jeder Finger links, rechts spielt der Computer gutmütig, `AI`; 2P: Bildschirmhälfte je Schläger, Finger je Zeiger).
  Treffer machen den Ball schneller (`BALL`), Fingerschläger treffen großzügiger (`PADDLE.assist`). Kein Verlieren: Vorbei = das Kind
  kichert, neuer Ball zu ihm. Ballwechsel zählen als kleine Bälle oben, alle `RALLY` Treffer ein goldener Stern, beide jubeln.
  Holzschild oben links = zurück.
- **Sternenflug** (Asteroiden, `src/scenes/AsteroidScene.ts`, `scene.openAsteroids(riders)`, Daten `src/data/asteroids.ts`,
  Zeichnungen `src/scenes/placeholders/asteroids.ts`): Rakete bis ans Ende des Weltalls fliegen und oben weiter nach oben ziehen
  (`WARP.holdTime`, die Sterne werden zu Strichen: `space.warp`) → weißer Blitz, die Wiese schläft, die Kinder aus der Rakete
  fliegen mit. Vorher enden alle Zieh-Vorgänge (`releaseAllDrags`). Rakete anfassen = fliegen, woanders tippen/halten = leuchtende
  Sterne dorthin schießen. Groß → 2 mittel → 2 klein → Glitzer; Steine laufen am Rand herum, die Rakete nicht. Zusammenstoß
  schubst nur (Kinder halten sich fest), keine Leben, keine Punkte; Welle geschafft = Jubel, goldener Stern oben, Ufo, nächste
  Welle einen Stein mehr. Erde unten links = zurück (Rakete sinkt dann von oben).
- Wetter (`src/world/Weather.ts`): Wolke antippen → nächstes Wetter (`WEATHER_ORDER`).
  Abfragen über `environment.weather` / `isRaining()` / `environment.wind`. Kein Gewitter,
  keine Blitze. Pfützen: `scene.weather.puddleAt(x, y)`.
  Wind setzt `environment.wind` (Grundwind + Böen), `windStrength()` gibt 0..~1,6.
  Spielzeuge driften über `params.windFactor` (in der Luft und am Boden).
  Schnee (`src/world/Snow.ts`): Schneedecke, Mützen, Schmelzen. Schneebälle/Schneemänner sind
  Katalog-Spielzeuge mit `hidden: true` (nicht in der Kiste) und `tags: ['snow']` (schmelzen).
- Inhalte (Spielgeräte, Gegenstände, Figuren) stehen als Daten in `src/data/`.
  Neues Zeug zuerst dort anlegen, Verhalten in `src/objects/`.
- Neue Spielgeräte: Klasse in `src/objects/Equipment.ts` von `Equipment` ableiten,
  `accepts()`/`use()`/`update()` überschreiben, in `createEquipment()` eintragen.
  Feste Spielgeräte: Baum, Schaukel, Sandkasten und das **Kletter-Spielhaus** (`PlayHouse`, #65, ersetzt die
  alte Rutsche): bis zu 3 Kinder im Modus `playing` (oben auf dem Podest oder drinnen), Maße in `PH`
  (`src/scenes/placeholders/playhouse.ts`). Rückseite, Kinder/Bälle drinnen und Vorderseite mit ausgestanzten
  Löchern liegen nach Tiefe übereinander, die Rutsche davor. Ein `Seat` kann mit `tap(kid)` auf Antippen
  des Kindes reagieren (dann hüpft es nicht), z. B. oben antippen = rutschen.
- **Ankleidekiste** (#70): große Pappkiste (`DressBox` in `Equipment.ts`, Zeichnung `src/scenes/placeholders/dressup.ts`;
  Vorderseite mit ausgestanzter Tür `dressbox`, dahinter das Innere `dressbox-inside`, das Kind geht dazwischen hinein).
  Kind hineinziehen → `scene.openDressUp(kid, back)`: Die Wiese schläft (`scene.sleep()`), das Ankleide-Spiel
  `DressUpScene` läuft (eigene Kid-Instanz groß vor der Kuschelecke, gedimmtes Licht per Multiplizieren-Rechteck,
  darüber warme Lichtinseln per ADD). Tür antippen → zurück,
  das Kind kommt aus der Kiste. Töne leitet die DressUpScene an die Wiese weiter (dort lebt der AudioContext).
  **Verkleidungen**: 10 Kostüme × 4 Stellen (`head`/`top`/`bottom`/`feet`), frei mischbar, Daten in
  `src/data/costumes.ts`, Zeichnungen in `src/scenes/placeholders/costumes.ts` (Ebenen `head`/`body`/`arm`/`leg`/`back`
  in Koordinaten der Körperteile). `kid.setOutfit(outfit)` legt sie als Auflagen auf die Körperteile (machen alle Posen
  mit). Gespeichert je Kind im Weltzustand `outfits` (`scene.setKidOutfit`), bleibt auch nach dem Heimgehen.
- Tippen: `obj.setData('onTap', fn)`. Die Szene ruft `fn(pointer)` auf, wenn nicht gezogen wurde.
- **Vorrang beim Antippen/Ziehen** (`touchRank` in `PlaygroundScene`): Kinder und kleine Spielzeuge
  gehen vor großen Spielgeräten (`large: true` im Katalog, z. B. Korb, Tor, Pool, Fahrzeuge) und vor
  feststehender Deko (`setData('scenery', true)`, z. B. der Baum) – auch wenn sie dahinter liegen.
  Leisten, Kiste und Tor behalten ihren Platz. Große Deko bekommt eine kleine Touch-Fläche.
  Ein Kind auf einem Fahrzeug (`mode === 'riding'`) zählt wie das Fahrzeug (sonst verdeckt es kleine Fahrzeuge ganz).
- Grafiken: Platzhalter entstehen in `BootScene` (Spielzeuge: `src/scenes/placeholders/toys.ts`). Echte PNGs kommen nach `public/assets/`
  und werden in `BootScene.preload()` unter demselben Texture-Key geladen.
- Code-Kommentare auf Deutsch, Bezeichner auf Englisch.

## Kinder
- Alle Kinder stehen in `src/data/characters.ts`, wer beim Start da ist in `PLACED_KIDS`
  (`src/data/playground.ts`). Die übrigen holt man durchs Gartentor.
- Ein Kind (`Kid`, ein `Container`) besteht aus Teilen an Gelenken: `body`, `head`, `arm-l/-r`,
  `leg-l/-r`. Rig (Maße, Drehpunkte, Gelenke) und Posen in `src/data/poses.ts`,
  `kid.setPose(name, ms)` blendet weich über (Posen: `stand`, `sit`, `sitLegsForward`, `armsUp`,
  `wave`, `dangle`, `hold`). Position = Fußpunkt, Gelenke steuert nur das Kind selbst.
  Kid bietet weiter an, was früher das Einzelbild konnte: `flipX`/`setFlipX`, `displayHeight`,
  `getBounds()` (ganze Figurfläche, unabhängig von der Pose), `setTint`, `setVisible`, `setScale`, `angle`.
  `handPoint()` und `headTop()` folgen der Pose.
- **Animationen** (`src/objects/kidMotion.ts`): Das Kind bewegt sich passend zu seiner Tätigkeit.
  Die Tätigkeit ergibt sich aus `kid.mode`; Spielgeräte sagen höchstens genauer, was das Kind tut:
  `kid.setActivity('ride-run')`, `kid.setActivity('bounce', { height, salto })`,
  `kid.setActivity('seesaw', { up })` (jedes Bild aufrufen ist in Ordnung). Die Gelenke steuert
  allein das Kind: Grundpose je Tätigkeit (`ACTIVITY_POSE`) + Bewegung (`activityMotion`, aus
  Zeit, zurückgelegtem Weg und Geschwindigkeit). Kurze Gesten: `hop`, `cheer`, `giggle`, `yawn`,
  `brace`, `kick`, `wave`, `yuck` (bäh), `no` (Kopfschütteln), `photo` (Kamera vors Gesicht) (`GESTURES`), Landen nach dem Loslassen: `land()`.
  Wer ein Kind auf einen Sitz setzt, legt die Hüfte auf den Sitz: `y = sitzY + kid.hipHeight()`
  (folgt der Pose, auch während des Überblendens), für Tweens `kid.sitHeight`.
  Gesichter (`kid-<id>-face-blink/-joy/-yawn`) liegen über dem Kopf; fehlen sie, bleibt das Gesicht gleich.
- Texturen: `kid-<id>-head/-body/-arm/-leg` (Einzelteile, Format in der README) und
  `portrait-<id>` (Kopf fürs Tor), Platzhalter in `src/scenes/placeholders/kids.ts`.
- Kinder kommen nur über `scene.spawnKid()` auf die Wiese und gehen über `GardenGate.sendHome()`.
  Wer ein Kind festhält (`Seat`), muss `unseat()` sauber umsetzen.

## Hund
- Der Hund (schwarzer Labrador, `src/objects/Dog.ts`, `scene.dog`) lebt immer auf der Wiese (kein Kind, nicht im Gartentor).
  Werte in `src/data/dog.ts` (`DOG`), Zeichnungen der Teile in `src/scenes/placeholders/dog.ts`
  (`dog-body`, `dog-leg`, `dog-tail`, `dog-head`, `dog-head-open`, `dog-head-sleep`). Teile an Gelenken wie beim Kind,
  Posen `stand`/`sit`/`lie`/`jump`, Sprünge über `lift` (y bleibt die Bodenlinie). Gespeichert als Weltzustand `dog`.
- Von selbst: streunt, schnüffelt, sitzt, liegt, stupst Kinder an (`giggle`), schläft nachts. Antippen = bellen,
  ziehen = Beine baumeln.
- Apportieren: Toy sendet beim Werfen `scene.events.emit('toy-thrown', toy)`; zusätzlich jagt er schnell Fliegendes/Rollendes.
  Bälle (`tags: ['ball']`), `glide` und `boomerang` fängt er im Sprung oder hebt sie auf und bringt sie dem nächsten Kind.
- Wasser: `dog.soak(jump?)` (Gießkanne, Sprenger), Pfützen, ins Planschbecken ziehen → danach schüttelt er sich, Kinder daneben kichern.

## Katzen
- Drei Nachbarskatzen (`CATS` in `src/data/cats.ts`: schwarz, rot mit weißem Bauch, grau getigert mit Stummelschwanz),
  Werte in `CAT`, Zeichnungen der Teile in `src/scenes/placeholders/cats.ts` (`cat-<id>-body/-leg/-tail/-head-<normal|blink|meow>`).
  `src/objects/Cat.ts`: `Cats` (`scene.cats`) schickt ab und zu eine los, wo man gerade hinschaut (höchstens `CAT.maxOut`,
  bei Regen keine; `cats.visit('roof'|'meadow')` zum Ausprobieren). Eine `Cat` arbeitet eine Liste von Schritten ab (laufen,
  springen, sitzen, putzen, liegen) und verschwindet danach. Wird nicht gespeichert.
- Wiese: springt hinter dem Zaun hoch, läuft ein Stück darauf (nie an den Toren, `CAT.fenceAvoid`), springt herunter,
  streunt, Kinder am Weg kichern; zum Gehen zurück auf den Zaun und dahinter hinunter. Tiefe je nach Ort: hinter dem Zaun,
  auf dem Zaun (hinter den Büschen), auf der Wiese = y. Wacher Hund in der Nähe → flüchtet auf den Zaun, der Hund
  bellt und rennt hinterher (`dog.chaseCat`).
- Dach: läuft über den waagerechten First (`ridge` in `HOUSE_SPECS`), in der Häuser-Ebene (`HOUSE_PARALLAX`) und
  hinter den Häusern, taucht also hinter dem Dach auf und wieder ab. Klein, aber mit großer Touch-Fläche.
- Antippen = miau (`meow`, pitch = Katze), sie setzt sich und schaut her. Nicht ziehbar.

## Töne
- Alles, was klingen soll, sendet `scene.events.emit('sound', { kind, pitch?, value?, voice?, x? })`
  (Typ `SoundEvent` in `src/data/sounds.ts`). `x` ist die Weltposition (leichtes Stereo).
- `src/audio/Sound.ts` (`scene.audio`) spielt dazu die Datei oder einen Platzhalter-Ton (WebAudio).
  Ton gibt es erst nach dem ersten Tippen (AudioContext entsteht dann, ohne Knopf).
  Höchstens 8 Töne gleichzeitig. Fehlende oder kaputte Dateien sind nie ein Fehler.
- **Neuen Ton ergänzen:** Eintrag in `SOUNDS` (`src/data/sounds.ts`) mit Platzhalter-`synth`,
  dann das Ereignis senden. Unbekannte `kind`s piepsen leise.
- **Datei ergänzen:** `public/assets/sounds/<kind>.mp3` (auch .ogg/.m4a/.wav), mit Tonhöhe
  `<kind>-<pitch>.mp3` (Xylophon 0–7). Welche Dateien es gibt, ermittelt ein Vite-Plugin beim
  Start/Bauen (`virtual:sound-files`) – nach neuen Dateien den Dev-Server neu starten.
- **Zählen:** `{ kind: 'count', value: n, voice: kidId }`. Gesucht wird
  `sounds/voices/<kidId>/count-<n>.mp3`, dann `sounds/voices/default/count-<n>.mp3`, dann
  deutsche Sprachausgabe (falls das Gerät eine hat), sonst n kurze Töne.
  Echte Kinderstimmen nur mit Okay der Eltern und nicht ins öffentliche Repo (#38).
- Bisherige Töne: `honk`, `drum`, `xylophone` (pitch 0–7), `pop`, `bubble`, `splash`, `click`, `kick`,
  `peekaboo`, `daytime`, `sprinkler-on`/`-off`, `gust`, `weather-<art>`, `count`,
  Grill: `sizzle`, `cut`, `squirt`, `wipe`, `yum`, `yuck`; Rakete: `liftoff`, `rocket`, `rocket-land`,
  `clouds`, `space`, `planet` (pitch), `ufo`, `shooting-star` (kein Dauer-Triebwerkston – der nervt);
  Bunker: `dig`, `bunker-found`, `hatch`;
  Hund: `bark`, `dog-catch`, `dog-shake`; Katzen: `meow` (pitch 0–2);
  Kreide: `chalk`, `chalk-pick` (Wischen: `wipe`);
  Kamera: `camera` (Auslöser), `photo` (Foto an der Leine/groß);
  Strom-Werkstatt: `circuit-switch`, `circuit-wire`, `circuit-unwire`, `circuit-gate`, `circuit-nope`, `circuit-lamp`, `circuit-win`;
  Zaubertrank: `brew-take`, `brew-add`, `brew-stir`, `brew-fairy`;
  Sternenflug: `warp`, `zap`, `crack` (pitch), `sparkle` (pitch), `bonk`, `wave-done`;
  Schminken: `paint`, `puff`, `glitter`, `tattoo-done`, `glue`, `peel`;
  Tischtennis: `pong-hit` (pitch), `pong-table` (pitch), `pong-miss`, `pong-star`.

## Speichern
- Die Wiese speichert sich automatisch lokal (`src/save/`, localStorage, kein Netzwerk).
  `AutoSave` vergleicht alle 250 ms den Stand und schreibt 500 ms nach der letzten Änderung,
  spätestens aber 3 s nach der ersten ungespeicherten (falls sich ständig etwas ändert, z. B. Schnee).
- Gespeichert werden Kinder und Spielzeuge mit ihrer `restPosition()` (laufende Aktionen
  zählen nicht) sowie Weltzustände, die per `scene.registerWorldState(key, …)` angemeldet sind.
- Format ändern: `SAVE_VERSION` erhöhen. Unbekannte Versionen und kaputte Daten führen zur
  Standard-Wiese (`PLACED_KIDS`/`PLACED_TOYS`), nie zu einem Absturz.

## So fügt man ein Spielzeug hinzu
1. Eintrag in `TOYS` in `src/data/toys.ts`: `id` (zugleich Texture-Key), `width`/`height`,
   `behaviors` (Bausteine) und optional `params` (Abweichungen von `DEFAULT_TOY_PARAMS`,
   z. B. `bounce`, `gravity`, `airDrag`, `spin`).
2. Platzhalter-Zeichnung unter derselben id in `src/scenes/placeholders/toys.ts`
   (fehlt sie, meldet `tsc` einen Fehler).
3. Es erscheint automatisch in der Spielzeugkiste. Soll es beim Start schon auf der Wiese liegen: Eintrag in `PLACED_TOYS` in `src/data/playground.ts`.

Szenencode bleibt unberührt. Vorhandene Bausteine (`src/objects/toys/behaviors/`):
`draggable` (ziehen, landet auf der Wiese), `fling` (schnell loslassen = werfen),
`kick` (Antippen = Schuss im Bogen), `wobble` (Antippen = wackeln),
`glide` (gleitet mit `params.lift`, z. B. Frisbee), `kidKick` (auf ein Kind fallen lassen = Kind kickt),
`plane` (Papierflieger mit Looping), `boomerang` (kommt zurück), `kite` (steigt beim Ziehen an
der Schnur), `float` (schwebt am Himmel), `holdable` (Kind hält es an der Schnur, `params.holdHeight`),
`pop` (Antippen = platzt mit Konfetti), `bubbles` (Antippen = Seifenblasen).
`hoop` (Basketballkorb mit Zielhilfe), `goal` (Fußballtor, Kinder jubeln), `cans`/`pins`
(Dosen/Kegel purzeln, Antippen baut neu auf; gemeinsame Logik in `toys/knockdown.ts`).
Treffer-Ziele reagieren nur auf Spielzeuge mit `tags: ['ball']`; Treffer bewusst großzügig.
`rideable` (Fahrzeug: Kind aufsitzen, fahren, ausrollen; Maße, Fahrstil und Räder in `src/data/vehicles.ts`,
z. B. `toddle` = sitzen und trippeln beim Rutschfahrzeug `ridecar`),
`honk` (Antippen = Hupe; Ton über `scene.events.emit('sound', { kind: 'honk' })`).
`trampoline`, `seesaw`, `hopper` (Hüpfball), `pool` (Planschbecken): Kinder sitzen über den
Helfer `toys/seats.ts` (`ToySeats`, Seat-Prinzip). `hula`: Das Kind hält den Reifen (handheld), Kind antippen = er kreist um die Hüfte (hintere Hälfte hinter,
vordere vor dem Kind, per `setCrop`), hört auf bei `kid.emit('tapped'|'grabbed')`.
`dig` (Schaufel), `fillable` (Eimer füllt sich), `mold` (Sandkuchen), `water` (Gießkanne,
Blumen), `sprinkler` (Partikel-Fontäne). Blumen und Sandkuchen verwaltet `src/objects/Garden.ts`
(`scene.garden`, gespeichert als Weltzustand `garden`, Obergrenzen 30 bzw. 5).
Hook `onReceive(kind, amount)` über `toy.receive()` (z. B. Sand in den Eimer).
`camera` (Kind antippen = es hebt die Kamera und fotografiert den Ausschnitt vor sich, `PHOTO` in `src/data/photos.ts`;
auf der Wiese antippen = löst aus; das Sofortbild entwickelt sich und hängt an der Fotoleine unter der Pergola,
`src/objects/Photos.ts`, `scene.photos`, höchstens `MAX_PHOTOS`, antippen = groß; gespeichert in eigenem localStorage-Eintrag
`src/save/photos.ts`), `drum`, `xylophone` (Platte aus der Tippstelle), `tent` (Kinder verstecken sich, Modus `hiding`),
`handheld` (Kind hält es in der Hand, Haltung als Daten `hold: { pose, dx, dy, angle }` im Katalog,
Armhaltungen `HOLD_POSES` in poses.ts), `flashlight` (Lichtkegel über die Lichtebene, auf der Tiefe des haltenden Kindes).
**In der Hand:** Ein Kind hält immer nur eines (`kid.holding`, `toy.heldBy`); `takeInHand`/`takeFromHand`
(`toys/hand.ts`) tauschen und lassen fallen. Kind antippen (oder das Gehaltene) ruft `onUse(kid)` der
Bausteine auf (pusten, trommeln, gießen, werfen per `toy.throwFromHand`, Hula starten), ohne Aktion hüpft
das Kind. `onLetGo(drop)`: loslassen. Zweihändiges (`twoHanded`) fällt beim Aufsitzen vor die Füße.
Gespeichert wird `heldBy` je Spielzeug; beim Laden hält das Kind es wieder.
`whirlpool`: bis zu 6 Kinder (Modus `bathing`), jedes Kind zählt reihum mit Hüpfer und
Zahlenblase (`sound` `count` mit `value` und `voice`); Antippen = neu zählen, ein 7. Kind landet daneben.
Hoher, freistehender Pool: Kinder hüpfen über den Rand hinein/hinaus, die Vorderwand (`whirlpool-front`,
Zeichnung `drawWhirlpool` in `placeholders/toys.ts`) verdeckt sie ab Brusthöhe.
Die Ziffern in der Blase sind die bewusste Ausnahme von „kein Text“ (Issue #37).
Weitere Hooks: `onToyDropped` (Spielzeug auf Spielzeug, z. B. Schubkarre), `onRemove`
(vor dem Wegräumen: Kinder absteigen lassen, Ladung ausschütten).
Bausteine können beim Loslassen `release.handled = true` setzen (eigene Bewegung statt Wurf-Physik).
Wind: `src/world/environment.ts` (`environment.wind`), Spielzeuge reagieren mit `params.windFactor`.

Neuer Baustein: Datei in `src/objects/toys/behaviors/` mit einer `BehaviorFactory`
(Hooks `onTap`, `onDragStart`, `onDragEnd`, `update`), in `behaviors/index.ts` eintragen,
`BehaviorId` in `toys.ts` erweitern. Bewegung läuft über `toy.physics` (`ToyPhysics`:
`vx` links/rechts, `vdepth` in die Tiefe = Bodenlinie `groundY`, `vz` Höhe; Bildränder, Zaun
und Vorderkante sind eine Bande), nicht über eigene Tweens auf x/y. Auf der Wiese losgelassen
geht senkrechtes Wischen zum Teil in die Tiefe (`params.depthShare`), in der Luft losgelassen
landet ein Spielzeug auf der Linie, wo es aufgehoben wurde (`toy.pickupGroundY`).
Rollen/Fliegen mit `params.spin` dreht über `toy.spin` (nur das Bild, um die Mitte; Fußpunkt, Touch-Fläche
und Bounds bleiben ungedreht), `toy.rotation`/`angle` dreht um den Fußpunkt (Wackeln).
Aufpralle: `toy.physics.landListeners`. Szene-Abfragen (z. B. Kinder) über `toy.scene as PlaygroundScene`.

## Zielgruppe
Kleine Kinder: große Touch-Flächen, sofortiges Feedback, nichts, was man kaputt machen
kann, keine Menüs, keine Werbung, keine Netzwerkzugriffe.
Ausnahme Inventare: erlaubt, wenn sie Teil der Spielwelt sind (Spielzeugkiste, Gartentor)
und ganz ohne Text auskommen. Dafür gibt es die Leiste `src/objects/Tray.ts`.
