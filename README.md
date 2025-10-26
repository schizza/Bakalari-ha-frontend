# Bakaláři Cards

Lovelace karty pro Home Assistant ve *společném balíčku*

[![CI](https://github.com/schizza/bakalari-ha-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/schizza/bakalari-ha-frontend/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/schizza/bakalari-ha-frontend)](https://github.com/schizza/bakalari-ha-frontend/releases)
[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/)
[![Release Drafter (dev)](https://github.com/schizza/Bakalari-ha-frontend/actions/workflows/release-drafter-dev.yml/badge.svg)](https://github.com/schizza/Bakalari-ha-frontend/actions/workflows/release-drafter-dev.yml)
[![Release Drafter (main)](https://github.com/schizza/Bakalari-ha-frontend/actions/workflows/release-drafter-main.yml/badge.svg)](https://github.com/schizza/Bakalari-ha-frontend/actions/workflows/release-drafter-main.yml)

## Instalace přes HACS

1. Přidej repo do HACS (typ **Ovládací panel (Plugin)**)
2. Nainstaluj **Bakaláři Cards**.
3. HACS většinou automaticky přidá resource `/hacsfiles/bakalari-cards/bakalari-cards.js`.
   Pokud ne: Settings → Dashboards → **Resources** → **Add** → URL `/hacsfiles/bakalari-cards/bakalari-cards.js` → typ **module**.

## Přidání karty na Dashboard
- v UI vyhledat požadovanou kartu `bakalari ...`
- nebo kofigurovat přímo v yaml editoru

## Dostupné karty:
 - Rozvrh
 - Zprávy

## Příklady použití

### Zprávy
```yaml
type: custom:bakalari-messages-card
entity: sensor.bakalari_zpravy_SuperDite
```
### Rozvrh
 - rozvrh má vizuální editor, kde lze přehledě nastavit požadované zobrazení
 - jako `entity` vyberze `sensor.bakalari_rozvrh_SuperDite`
 
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
```

 
