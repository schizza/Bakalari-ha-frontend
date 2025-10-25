# Bakaláři Cards

Lovelace karty pro Home Assistant ve *společném balíčku*

[![CI](https://github.com/schizza/bakalari-ha-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/schizza/bakalari-ha-frontend/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/schizza/bakalari-ha-frontend)](https://github.com/schizza/bakalari-ha-frontend/releases)
[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/)
[![Release Drafter (main)](https://github.com/schizza/Bakalari-ha-frontend/actions/workflows/release-drafter-main.yml/badge.svg)](https://github.com/schizza/Bakalari-ha-frontend/actions/workflows/release-drafter-main.yml)
[![Release Drafter (dev)](https://github.com/schizza/Bakalari-ha-frontend/actions/workflows/release-drafter-dev.yml/badge.svg)](https://github.com/schizza/Bakalari-ha-frontend/actions/workflows/release-drafter-dev.yml)

## Instalace přes HACS

1. Přidej repo do HACS (typ **Ovládací panel (Plugin)**)
2. Nainstaluj **Bakaláři Cards**.
3. HACS většinou automaticky přidá resource `/hacsfiles/bakalari-cards/bakalari-cards.js`.
   Pokud ne: Settings → Dashboards → **Resources** → **Add** → URL `/hacsfiles/bakalari-cards/bakalari-cards.js` → typ **module**.

## Přidání karty na Dashboard
- v UI vyhledat požadovanou kartu `bakalari ...`
- nebo kofigurovat přímo v yaml editoru

## Příklady použití

```yaml
type: custom:bakalari-messages-card
entity: sensor.bakalari_zpravy_SuperDite

type: custom:bakalari-grades-card

type: custom:bakalari-timetable-card
```
