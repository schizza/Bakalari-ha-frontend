# Changelog

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
