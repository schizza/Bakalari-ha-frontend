# Changelog

# 0.5.0

## ✨ Nové funkce

**Recent marks on top (#53) @schizza**
- Přidána možnost zobrazit blok `Poslední známky` nad `Předměty` 

**Add option to select subject sensors in UI (#56) @schizza**  
- Přidána možnost výběru filtrace předmětů přes UI
- V základní nastavení jsou zobrazeny všechny předměty
- Lze filtrovat podle pravidla: `Zobrazit pouze` a `Nezobrazovat`
- Lze zapnout, aby `Poslední známky` respektovaly filtr pro `Předměty`, tudíž se nebudou zobrazovat poslední známky z vyfiltrovaných předmětů.

**Adds Eye icon to indicate if mark has been viewed. (#59) @schizza**
- přidána ikona oka, které signalizuje, zda známka byla podepsána či ne
- otevřené oko - známka podepsána, přeškrtnuté oko - známka nepodepsána

## 🐛 Opravy chyb

**Fix rendering last_marks (#52) @schizza**
- opraveno vykreslení posledních známek
- známky se nyní dynamicky mění při změně stavu a ne až po reloadu

**Fixes sorting subjects by name or abbr. (#61) @schizza**
- opraveno třídění předmětů podel jména nebo zkratky

**Use date-only formatting and adjust recent item layout (#60) @schizza**
- změna vykreslení datumu známky, nově se vykresluje pouze datum bez času
- změna rozvržení textu v `Poseldní známky`, tak aby popis známky byl čitelnější

**Long text marks are shortend. (#58) @schizza**  
- Změna chování textu známky. Pokud je text delší než 3 znaky, pak se zkrátí na jeden znak
- zlepší se vykreslování seznamu známek
- například: již se nezobrazuje ve známce text `Nemoc`, ale jen `N`
- plný text se zobrazí v popisu při najetí myši na známku

**Title of mark (#57) @schizza**
- titulek (popis známky) upraven na 2 sloupce
- datum odsazeno na druhý řádek

**Toggle subject (#55) @schizza**
- oprava `Event key` - zpráva posílá pouze název senzoru a ne celý objekt

- odstraněna možnost `include_subject_ids/exclude_subject_ids`
- nahrazena vizuálním editorem

- přidán fallback pro `SubjectSummary` při neexistujícím předmětu.

# 0.4.0

## ✨ Nové funkce

**Refactor/grades all  (#50) @schizza**
- Refaktorizace karty`Všechny známky` tak, aby využívala nově vzniklé senzory pro známky.
- Odstraňuje zastaralou variantu spolu se souvisejícími pomocnými funkcemi a styly.
- Mění práci s předměty tak, aby využívala jednodušší systém založený na senzorech pomocí sensor_map.
- Zjednodušené získávání a třídění známek.
- Rozdělení logiky do menších, znovu použitelných částí.

# 0.3.2

## Co je nového

## 🐛 Opravy chyb

### Karta `Zprávy`

**Attaches and detaches event listeners correctly (#48) @schizza**
- Na kartě `Zprávy` opraven problém s vícenásobným přidávání `Listeners`, což mohlo vést k nemožnosti kliknout a robalit zprávu.
- Po odpojení elementu odstaví event listenery a vyčistí debounce timer, čímž zabrání únikům paměti a nečekanému chování.

**Improves text and link formatting (#47) @schizza**
	Zajišťuje správnou konverzi odkazů a escapování URL adres.
	Formátuje textové uzly odlišně podle jejich nadřazeného tagu pro lepší linkifikaci.
	Escapuje URL adresy, aby se zabránilo potenciálním injection zranitelnostem..

**Improves message card click handling (#46) @schizza**
- Přesouvá registraci obsluhy kliknutí do `connectedCallback` a její odpojení do `disconnectedCallback` pro správné řízení životního cyklu prvku.
- Mění obsluhu kliknutí tak, aby přepínala třídu 'open' na prvku položky.
-	Upravuje generování ID tak, aby neobsahovalo index, čímž se předchází problémům při změnách seznamu.
-	Zajišťuje, že ve stavu „open“ zůstávají pouze aktuálně zobrazené zprávy, a odstraňuje zastaralé záznamy.

# 0.3.1

## ✨ Nové funkce

**Nová Lovelace karta pro `Známky`**
 - Sumarizace předmětů, zobrazení všech dostupných známek
 - zobrazení posledních přijatých známek
 - konfigurační editor pro kartu s nastavením filtrování známek

**Persists search query in local storage (#41) @schizza**
 - Upraveno vyhledávací pole karty `Zprávy`, kdy hledaný text si pole pamatuje (např. při reloadu)

## 🐛 Opravy chyb

- Fixes unread message filtering (#40) @schizza
Oprava chyby pro zobrazení nepřečtených zpráv v kartě `Zprávy`

## 🧹 Refaktoring / Údržba

- refactor: Refactors Bakalari messages card (#39) @schizza
  Refactor Messages card.

---

# 0.2.0

## Co je nového

## ⚠️ Breaking changes
 - sloučení `Rozvrhu Plus` a `Rozvrhu`
    - po update na novou verzi stačí v yaml editoru karty změnit `type: custom: bakalari-cards-timetable-plus` na `type: custom: bakalari-cards-timetable`
      - všechna nastavení se zachovají a karta se nerozbije

 - karta `Rozvrh` bude již jediná udržovaná
 - všechny funkcionality z testovací karty `Rozvrh Plus` jsou zachovány ve standardní kartě `Rozvrh`

## ✨ Nové funkce

 - Přidává podporu pro zobrazení `Kroužků`  v kartě rozvrhu, které se načítají ze samostatného senzoru (konfigurace přes `configuration.yaml`
 - Zavádí možnosti konfigurace pro povolení/zakázání kroužků a pro určení entity a atributu s daty o kroužcích

- Vylepšuje flexibilitu karty novými funkcemi:
  - vlastnost short pro události v kalendáři
  - druhy a stylování svátků/prázdnin
  - možnost invertovaného režimu
  - kompaktní režim s kratšími popisky
  - podbarvení aktuálního dne

## 🐛 Opravuje
- Opravuje problém, kdy chybějící atributy rozvrhu způsobovaly selhání karty. Nyní se místo toho zobrazí chybová zpráva.
- zlepšuje uživatelský zážitek díky lepšímu zpracování časových úseků obsahujících pouze svátky, navigaci mezi dny a vylepšeným tooltipům.

Fix https://github.com/schizza/Bakalari-ha-frontend/issues/27

Fix https://github.com/schizza/Bakalari-ha-frontend/issues/32

---
- Autoři: @schizza

# 0.1.4

## 🐛 Funkcionalita

Přidána nová karta `Rozvrh Plus`, která umožňuje zobrazení kroužků z
vlastního senzoru.

- Adds Rozvrh Plus card for testing purpose. (#28) @schizza
- Nastavení karty Plus a vlastního senzoru
---

# 0.1.3

## Co je nového
 - Přidána karta Rozvrhu.
  - Karta načítá data rozvrhu z atributu entity v Home Assistantu a zobrazuje je v mřížkovém formátu. Nabízí možnosti pro kompaktní zobrazení, zobrazení víkendu a navigaci mezi týdny. Zahrnuje také možnosti konfigurace pomocí UI.

# First release
 - přidána karta pro Zprávy
 - placehodery pro Rozvrh a Známky
