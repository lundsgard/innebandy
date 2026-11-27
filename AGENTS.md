# Floorball Faceoff

Vi bygger ett innebandyspel tillsammans hemma. Målet är att en kompis ska kunna öppna en länk på mobilen, förstå hur man spelar och vilja köra en omgång till. Teo bestämmer vad som känns som innebandy. Anders samarbetar med Codex och sköter publiceringen.

## Första spelbara versionen

Utgå från en straffduell om vi inte har valt ett annat spelmoment. Börja med en spelbar situation som Teo kan påverka direkt.

1. Visa ett innebandymål, en knästående målvakt och en vit hålboll på ett sportgolv. Använd en fast kamera snett ovanifrån. Målet och bollen ska synas samtidigt på mobilen.
2. Låt spelaren trycka eller klicka där skottet ska gå. Visa bollens väg. Målvakten rör sig i sidled så att både riktning och tajming spelar roll. Avgör mål, räddning eller miss utifrån var bollen faktiskt går.
3. Visa resultatet direkt och lägg fram en ny boll. Den första provspelningen är klar när Teo kan göra mål, få ett skott räddat och skjuta igen utan att ladda om sidan.

Låt oss provspela här. Tröjfärg, hallens namn och målfirande är exempel på val som Teo kan göra när han har känt på spelet. För inspiration från EA:s NHL-spel, börja med en detalj i taget, till exempel ett tydligt stolpljud eller en resultattavla som reagerar på mål.

## Efter första provspelningen

Nästa föreslagna steg är en duell på samma mobil. Två spelare turas om med fem skott var mot målvakten. Visa vems tur det är, räkna varje avslutat skott en gång och erbjud returmatch som nollställer resultatet. Provspela en hel omgång med två personer.

Första delningen är en vanlig webblänk som en kompis kan öppna utan installation eller inloggning. Om Teo senare vill möta någon hemifrån, ta reda på om de vill jämföra resultat eller om en ska styra målvakten medan den andra skjuter. Det avgör vilket nätverksstöd spelet behöver.

## Teknik och återkoppling

- Börja med TypeScript, Phaser och Vite. Använd samma skottlogik för pekskärm och mus. Håll första versionen statisk så att den går att publicera på GitHub Pages under repots sökväg.
- Vid första implementationen, gör det möjligt att starta lokalt med npm install och npm run dev. Ge Anders kommandot för att testa på en mobil på samma wifi. När delning blir aktuell, kontrollera att även bilder och ljud laddas från den publicerade adressen.
- Samla värden som bollfart, målvaktsfart och målbredd på ett lättfunnet ställe. Om Teo säger ”målvakten är för snabb”, ändra en sak och låt honom prova samma skott igen.
- Använd korta svenska texter i spelet. Efter en ändring, kör npm run build och ange kort vad vi kan prova och vad som faktiskt har testats.
