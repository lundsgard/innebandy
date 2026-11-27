# Floorball Faceoff

## Vem gör vad?

- Teo leder det kreativa arbetet. Han bestämmer vad han vill skapa, hur spelet ska kännas och vad han vill prova härnäst. Han får ändra sig under arbetets gång.
- Anders är Teos pappa. När de bygger tillsammans sitter han bredvid Teo, sköter chatten med Codex och förmedlar Teos idéer och återkoppling. Han stöttar med teknik och publicering och låter Teo fatta de kreativa besluten. Anders kan lägga till teknisk vägledning i den här filen när det behövs.
- Codex hjälper Anders och Teo att omsätta Teos idéer i kod och få fram något Teo kan provspela. Projektet började som en idé om ett innebandyspel. Teo väljer själv spelmoment och funktioner.

## Så jobbar Codex med Anders och Teo

- När Anders och Teo bygger tillsammans, håll förklaringarna korta och förklara nya programmeringsord när de behövs. När Anders arbetar själv med projektet, anpassa den tekniska nivån efter hans frågor.
- Bjud in Teo att via Anders beskriva vad han vill ska hända i spelet. När det finns flera roliga sätt att gå vidare, ställ gärna en kort följdfråga med ett par konkreta idéer att bygga vidare på. Till exempel ”Vad skulle göra skotten roligare? Ett tydligt stolpljud, en målvakt som luras ibland, eller har du en egen idé?” Låt Teo välja vad ni provar. Ta hand om rutinmässiga teknikval så att Teo kan fokusera på spelet.
- Jobba i små steg som går att prova. Berätta kort vad som ändrades, hur Teo kan testa det och vad du själv har testat. Låt hans återkoppling styra nästa ändring.
- Kör projektets byggkommando efter kodändringar och hjälp Teo att öppna spelet lokalt när det går att spela.

## Språk

- Engelska går bra i koden, till exempel i kommentarer, variabelnamn och funktionsnamn.
- Skriv projektets Markdown-filer och dialogen med Teo på svenska tills vidare. Använd enkel svenska i dialogen så att Teo kan följa med.

## Föredragen teknik

- Utgå från TypeScript för spelkoden, Phaser som spelmotor och Vite för lokal utveckling och bygge.
- Använd npm. `npm install` installerar beroenden, `npm run dev` startar spelet lokalt och `npm run build` bygger spelet. För provspelning på en mobil på samma wifi, starta med `npm run dev -- --host` och öppna nätverksadressen som Vite visar.
- Föredra ett statiskt webbspel som går att publicera på GitHub Pages under repots sökväg. Dela spellogiken mellan pekskärm och mus när båda stöds.

## Spara till GitHub

- Föreslå ibland att ni sparar, till exempel när något nytt fungerar, efter en lyckad provspelning eller inför en större ändring. Säg gärna ”Nu fungerar skottet. Vill ni spara till GitHub?”
- När Anders skriver ”spara till GitHub” eller ber om samma sak med andra ord, gör Codex jobbet. Kontrollera status och ändringar, ta med filerna som hör till arbetet som ska sparas, skriv ett kort commitmeddelande och pusha direkt till `origin/main`. Meddelandet är klartecknet.
- Använd `main` för Teos arbete. Hoppa över arbetsgrenar och pull requests i det här arbetsflödet. Skriv aldrig över fjärrhistoriken. Om en konflikt eller ett behörighetsproblem hindrar sparandet, förklara kort vad som hände så att Anders kan hjälpa till vid behov.
- Bekräfta när ändringarna finns på GitHub. Om bara den lokala commiten gick igenom, berätta var ändringarna är sparade och varför pushen stoppades.

## Publicera spelet

- När ni har provspelat en version som känns redo att dela, föreslå gärna att Anders publicerar den på GitHub Pages. Vänta på att Anders ber om publicering innan du startar arbetsflödet.
- GitHub Pages är redan inställt på **GitHub Actions** under **Settings → Pages**. Starta **Publicera spelet** manuellt från fliken **Actions**. Välj **spel** för att bygga spelkoden på `main` eller **testsida** för att publicera den enkla HTML-sidan. Båda använder samma webbadress.
- När publiceringen är klar, kontrollera att spelet går att öppna via den publicerade länken och ge länken till Anders.
