# Bakaláři Cards

Lovelace karty pro Home Assistant ve *společném balíčku*

[![CI](https://github.com/schizza/bakalari-ha-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/schizza/bakalari-ha-frontend/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/schizza/bakalari-ha-frontend)](https://github.com/schizza/bakalari-ha-frontend/releases)
[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/)
[![Release Drafter (dev)](https://github.com/schizza/Bakalari-ha-frontend/actions/workflows/release-drafter-dev.yml/badge.svg)](https://github.com/schizza/Bakalari-ha-frontend/actions/workflows/release-drafter-dev.yml)
[![Release Drafter (main)](https://github.com/schizza/Bakalari-ha-frontend/actions/workflows/release-drafter-main.yml/badge.svg)](https://github.com/schizza/Bakalari-ha-frontend/actions/workflows/release-drafter-main.yml)
[![Downloads (total)](https://img.shields.io/github/downloads/schizza/bakalari-ha-frontend/total)](https://github.com/schizza/bakalari-ha-frontend/releases)
[![Downloads (latest)](https://img.shields.io/github/downloads/schizza/bakalari-ha-frontend/latest/total)](https://github.com/schizza/bakalari-ha-frontend/releases)


## Instalace přes HACS

1. Přidej repo do HACS (typ **Ovládací panel (Plugin)**)
2. Nainstaluj **Bakaláři Cards**.
3. HACS většinou automaticky přidá resource `/hacsfiles/bakalari-cards/bakalari-cards.js`.
   Pokud ne: Settings → Dashboards → **Resources** → **Add** → URL `/hacsfiles/bakalari-cards/bakalari-cards.js` → typ **module**.

## Přidání karty na Dashboard
- v UI vyhledat požadovanou kartu `bakalari ...`
- nebo kofigurovat přímo v yaml editoru

## Dostupné karty:
 - Rozvrh (již obsahuje funkce z karty Rozvrh Plus)
 - Zprávy

## Příklady použití

### Zprávy
 - nově lze ve zprávách kopírovat text zprávy do schránky

```yaml
type: custom:bakalari-messages-card
entity: sensor.bakalari_zpravy_SuperDite
```

### Rozvrh
 - rozvrh má vizuální editor, kde lze přehledě nastavit požadované zobrazení
   - doporučené je použití vizuálního editoru
 - jako `entity` vyberze `sensor.bakalari_rozvrh_SuperDite`
 - kompaktní režim (`compact: true`) minimalizuje tabulku pro zobrazení i na malých obrazovkách (mobilních zařízeních)
 - rozvrh lze přepnout i do inverzního režimu, kdy se prohodí řádky a sloupce

### Rozdíl mezi normálním a kompaktním režimem rozvrhu:

 - Normální režim zobrazuje rozvrh v plné šířce a výšce, což může být obtížné zobrazit na malých obrazovkách.
 - Kompaktní režim (`compact: true`) nezobrazuje časové sloty s popisem hodiny, nicméně lze zapnout zobrazení legendy pod tabulkou
  - Plný název hodiny vč. času se zobrazí v `tooltip`u při najetí myši na slot.
  - přeheld týdnů je zobrazen jako `Dnes` případně `+-7 dní / +- 14 dní`
  - automatiky jsou schovány i prázdné hodiny, ev. hodiny, které obsahují jen `Svátek` nebo `Prázdniny`

Příklad zobrazení plného a kompaktního režimu:
[![Kompaktní režim](https://github.com/schizza/Bakalari-ha-frontend/blob/v0.2.0/docs/rozvrh.png)](https://github.com/schizza/Bakalari-ha-frontend/blob/v0.2.0/docs/rozvrh.png)

 příklad použití v `yaml editoru`:
 ```yaml
 type: custom:bakalari-timetable-card
 entity: sensor.bakalari_rozvrh_SuperDite
 compact: true # kompaktí zobrazení (menší rozvrh)
 title: Rozvrh pro SuperDítě
 day_col_width: 55 # šířka sloupce pro dny v rozvrhu
 slot_min_width: 66  # šířka sloupce pro sloty v rozvrhu
 fit: scroll # nebo shrink - pokud je rozvrh velký, umožni scrollování
 hide_empty: true  # skryje prázdné sloty v rozvrhu
 show_weekends: false  # zobrazení víkendy v rozvrhu
 grid_options:
   columns: 24
   rows: 6
 short: true   # zobrazuje dny v týdnu v krátkém formátu
 show_legend: true # zobrazuje legendu s informacemi o slotech
 clubs_enabled: false # umožní zobrazení kroužku - tyto se musí nadefinovat ve vlastním senzoru
 clubs_entity: sensor.my_clubs_childname  # jméno senzoru s kroužky
 clubs_attribute: clubs # jméno vašeho atributu s parametry kroužků - defaul: clubs
```
### Pokud chcete zobrazovat i rozvrh kroužků
do `configuration.yaml` je nutné přídat vlastní senzor, který bude obsahovat kroužky

Co obsahuje pole:
```
time-span - id: jedinečné pro časový slot, určuje čas kroužku
          - start: začátek hodiny
          - end: konec hodiny
          - day: číslo dne v týdnu 0 - neděle, 1 - pondělí, ...

classes:  - time-id - id časového slotu
          - name: název kroužku
          - short: krátký název kroužku, který se zobrazuje v kompaktním režimu
```

`configuration.yaml`:
```yaml
template:
  - sensor:
      - name: "my_clubs_dite_1"  # jméno senzoru - toto hledá nastavení karty
        state: "1"
        attributes: # jméno atributu, který bude karta zobrazovat
          clubs: >
            {{ {
              'time-span': [
                {'id': 1, 'start': '16:00', 'end': '17:45', 'day': 2},
                {'id': 2, 'start': '14:10', 'end': '16:45', 'day': 3}
              ],
              'classes': [
                {'time-id': 1, 'name': 'Kreslení', 'short': 'KRS'},
                {'time-id': 2, 'name': 'Housle', 'short': 'HOU'}
              ]
            } | tojson }}

      - name: "my_clubs_dite_2"  # jméno senzoru - toto hledá nastavení karty
        state: "1"
        attributes: # jméno atributu, který bude karta zobrazovat
          clubs: >
            {{ {
              'time-span': [
                {'id': 1, 'start': '13:00', 'end': '15:00', 'day': 1},
                {'id': 2, 'start': '16:00', 'end': '18:30', 'day': 5}
              ],
              'classes': [
                {'time-id': 1, 'name': 'Housle', 'short': 'HOU'},
                {'time-id': 2, 'name': 'Softball', 'short': 'SFT'}
              ]
            } | tojson }}
```
