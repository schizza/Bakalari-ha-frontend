# Bakaláři Cards

Lovelace karty pro Home Assistant ve *společném balíčku*

[![CI](https://github.com/schizza/bakalari-cards/actions/workflows/ci.yml/badge.svg)](https://github.com/schizza/bakalari-cards/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/schizza/bakalari-cards)](https://github.com/schizza/bakalari-cards/releases)
[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/)

## Instalace přes HACS

1. Přidej repo do HACS (typ **Frontend**)
2. Nainstaluj **Bakaláři Cards**.
3. HACS většinou automaticky přidá resource `/hacsfiles/bakalari-cards/bakalari-cards.js`.
   Pokud ne: Settings → Dashboards → **Resources** → **Add** → URL `/hacsfiles/bakalari-cards/bakalari-cards.js` → typ **module**.

## Příklady použití

```yaml
type: custom:bakalari-overview-card

type: custom:bakalari-grades-card

type: custom:bakalari-timetable-card
```
