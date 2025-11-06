# Changelog

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

Fix of lost focus on search input by rendering only the message body on search input.

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
