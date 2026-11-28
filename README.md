# Teos innebandy

Ett innebandyspel som byggs ett litet steg i taget efter Teos idéer.

## Spela lokalt

```sh
npm install
npm run dev
```

Öppna adressen som visas i terminalen och tryck **Starta match**. Du spelar **Nykvarns IF** mot datorns **Nyköping FBC**. Varje lag har fyra utespelare och en målvakt: totalt fem mot fem. Matchklockan räknar ned två minuters speltid och stannar vid mål och uppstarter. **Ny match** nollställer resultatet. När tiden är slut visas resultatet och det går att spela igen.

Spring med **WASD eller piltangenterna**. Riktningarna följer kameran. Håll musen eller fingret på motståndarnas mål för att sikta och släpp för att skjuta. **Mellanslag** eller **Skjut** skjuter också. Välj **Lågt**, **Halvhögt** eller **Högt**, eller finjustera höjden med reglaget. Den prickade bollbanan visar vart skottet går. Höga skott kan gå över ribban.

Tryck **P** eller **Passa** för att passa till en fri lagkamrat. När passningen kommer fram byter du spelare. Utan boll byter samma knapp till en annan hemmaspelare. **B** eller **Byt spelare** byter också. Ringen på golvet, pilen över huvudet och tröjnumret i spelytan visar vem du styr. Utan boll använder du **mellanslag/Bryt** nära motståndarens boll för att försöka vinna den.

Datorlaget försöker vinna bollen, passa och skjuta. Lagkamrater söker passningsytor i anfall och hjälper till i försvar. Motståndare kan bryta passningar och täcka skott. Båda målvakterna följer bollen och lyfter händerna mot höga skott. Räddningar och stolpträffar ger returer som går att ta hand om. Mål och utanförskott ger en kort uppstart med nya positioner och boll till det andra laget. Det är den första, förenklade matchversionen.

På pekskärm finns stora pilknappar och knappar för **Skjut/Bryt** och **Passa/Byt** direkt på spelytan. Övriga kontroller finns under planen. Det går att hålla en riktningsknapp med ett finger och sikta med ett annat. **Kamera** växlar mellan hela planen, en närmare vy bakom spelaren och en läktarvy där människor och djur syns tydligare.

Hallen heter **Furuborghallen**. Utseendet är inspirerat av Teos referensbilder: en långsidesläktare med tolv rader mörkgröna stolar, ljusa träkanter, grå trappgångar, metallräcken, trästolpar och ljusa väggar. På det ljusa parkettgolvet finns också hallinjer för andra sporter. Taket med träbalkar och ljusarmaturer syns i den nära kameran. Hallen är en tolkning av bilderna; läktarens och byggnadens mått är uppskattade. Spelarna har animerade leder, mjuk acceleration, olika utseenden, matchställ och tröjnummer. Spelarna har vuxna kroppsproportioner, sammanhängande formade ytor för ansikte och tröja, mindre huvuden, små ögon med iris, näsa, läppar, öron och hårfäste. Armar och ben smalnar av vid lederna; fingrarna griper om klubban. Löpningen böjer höft, knä och fotled. Modellerna är byggda i kod och är ännu inte fotorealistiska. Nykvarns svarta och Nyköpings gröna speltröjor är inspirerade av klubbarnas egna [uppgift om svart matchställ](https://www.laget.se/steelers-H2/News/8167888/Fotografering-) och [uppgift om grönt matchställ](https://www.fbcnykoping.se/fbcnykoping-p14-15/match/21423516/jarna-sk). Spelarna och numren är påhittade.

## Namn och hejarklack

Alla åtta utespelare och båda målvakterna har påhittade efternamn på tröjorna. Nykvarns nummer **10 heter Lundsgård**. Namnet visas också för spelaren du styr, vid passningar och i **Lagens spelare** under spelytan.

Furuborghallens läktare har 640 människor och 80 hundar, katter och kaniner. Människorna viftar med armarna, och det finns Nykvarnsbanderoller. **Kamera: Läktaren** ger en närmare titt. Upprepade publikdelar ritas tillsammans och armarna uppdateras 15 gånger per sekund för att begränsa arbetet för grafiken.

Tryck **Starta match** för svenska hejarop och handklapp. **Heja Nykvarn!** spelar ett rop direkt. **Publikljud: På/Av** styr ljudet. Orden visas även i text. Klacken ropar regelbundet under matchen och firar Nykvarns mål. Ljudet stoppas när sidan döljs och när matchen tar slut. Ljudfilerna i `public/audio/` är lokalt skapade med den svenska datorrösten Alva, med flera svagare röstlager, en kort hallklang och handklapp. Inga inspelningar av en riktig publik används. Webbläsaren behöver ingen installerad svensk röst.

## Mått och skala

En enhet i spelvärlden är en meter. Planens innermått är **40 × 20 m**, sargen **0,50 m** hög och hörnradien **2 m**. Målen har yttermåtten **1,60 × 1,15 m**, bottendjup **0,65 m**, övre djup **0,40 m** och målram av 32 mm rör. Mållinjerna ligger 3,5 m från kortsidorna. Målområdena är 5 × 4 m, målvaktsområdena 2,5 × 1 m och målmarkeringarna är 5 cm breda. Mittpunkten och tekningspunkterna är innebandymarkeringar. Den röda mittcirkeln, den gula mittlinjen och de extra rektanglarna hör till hallens övriga golvlinjer och är inspirerade av fotona.

Plan och markeringar följer [IFF:s spelregler 2026, avsnitt 101–103](https://www.floorball.sport/wp-content/uploads/2026/02/Rules-of-the-Game-2026-with-all-changes-260209.pdf). Mål-, sarg- och bollmåtten utgår från [IFF:s materialregler 2024, avsnitt 2.2–2.4](https://archive.floorball.sport/cloudfront/2024/06/Material-Regulations-SPCR011_2024_Final.pdf). Den valda hörnradien är materialreglernas nominella mått.

Spelarnas valda referenslängd är **1,80 m**. En knästående målvakt når cirka **1,25 m** över golvet. Bollen är **72 mm** i diameter. Klubbskaftet och bladet har fått tunnare spelmodeller. Alla dessa föremål använder samma meterskala, och människorna förstoras inte när kameran visar hela planen.

Det går att springa bakom målen. Spelare och bollhållare stoppas av både rak och rundad sarg samt av målnäten. Låga bollar studsar tillbaka mot sargen, också i hörnen. Bollar som går över sargen lämnar planen. Passningar och skott bakifrån stoppas av nätet. Skottfart, passningsfart, löpning, lagens placeringar och kamerorna är anpassade till den större planen. Mått och gemensam geometri finns i `src/rink-dimensions.ts`; det som ritas och det som bollen krockar med använder samma mått.

## Mobil på samma wifi

För att spela på en mobil på samma wifi:

```sh
npm run dev -- --host
```

Öppna nätverksadressen som visas i terminalen på mobilen.

## Bygga

```sh
npm run build
```

`npm test` kontrollerar laguppställningar, matchstart, klocka och matchslut, löpning, bollvinster, passningar och brytningar, datorlagets anfall, mål i båda riktningarna, höga skott, båda målvakternas räddningar, stolpar och ribba. Måttkontroller mäter även den faktiska mål- och sarggeometrin. Sargstudsar och rörelsegränser testas i alla fyra hörnen. Snabba bollar kontrolleras längs hela sin väg mellan två bildrutor.

Spelet använder TypeScript, Three.js och Vite. Three.js ersätter den första versionens Phaser för att visa planen, människan, klubban och bollen i riktig 3D. Bygget hamnar i `dist/` och använder relativa filsökvägar så att det går att publicera under repots sökväg på GitHub Pages.

## Figur till 3D-skrivare

Under spelet finns en länk till `public/models/teos-innebandyspelare.stl`. Utskriftsfiguren behåller den tidigare, enklare grundformen, med en större boll, en förstärkt klubba och en fot som håller ihop alla delarna för utskrift. Spelets människor använder egna, mer detaljerade modeller med leder, formade ansikten och en tunnare klubba. Små färgdetaljer som ögon och tröjnummer finns bara i spelet. STL-filen saknar färger.

Öppna filen som **millimeter** i skrivarens program, med fotens plana sida nedåt. Figuren är ungefär 10 cm hög, inklusive foten. Exakta mått finns i JSON-filen bredvid STL-filen. Klubbskaftet är 3,5 mm tjockt. Använd stöd under armarna, händerna och klubban. Granska förhandsvisningen i skrivarens program och anpassa inställningarna efter skrivaren. Figuren är inte provutskriven.

`npm run model` skapar STL-filen från `src/player-model.ts` med Manifold. Det körs även vid bygge. Skriptet kontrollerar att modellen är en enda sammanhängande, sluten volym, att varje kant delas av två trianglar och att ytan är vänd utåt. Mått och kontrollresultat sparas i JSON-filen bredvid figuren.

## Publicera

När Anders ber om publicering: spara spelkoden till `main` och starta arbetsflödet **Publicera spelet** i GitHub Actions med valet **spel**. Valet **testsida** publicerar i stället testsidan. Publiceringen startar bara manuellt.
