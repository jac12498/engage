# NY State Voter Records

New York State BOE voter file, converted to parquet for DuckDB queries. Built
**offline** (the source CSV is ~6 GB) via:

```
npm run voters:convert-ny [--force] [--sample]
```

Place `AllNYSVoters_*.csv` in this folder first. `--sample` uses `sample_voters.csv`
(a tiny local test file — never committed) instead of the full file.

## Tracked reference artifacts (metadata, no PII)

- `schema.json` — the 47-column headerless voter-file layout (drives the conversion).
- `election_mappings.json` — curated raw→standardized election-code map. **County
  election codes vary** (abbreviations vs. full text); the converter joins raw codes
  to this to standardize them, and keeps anything unmapped as the raw code. This is a
  static copied artifact (regenerating it needs version10.3's `Election` pipeline).

## Outputs (gitignored — large / PII)

- `voters.parquet` (~650 MB) — one row per voter; named columns incl.
  `state_voter_id, first_name, last_name, residence_address_number, residence_street,
  residence_city, residence_zip5, dob, registration_party, county_code, district_*`.
- `voting_history.parquet` (~440 MB) — one row per (voter × election):
  `state_voter_id, county_code, election_code, raw_election_code, is_standardized,
  vote_method, election_year, election_type_hint`.
- `unmapped_election_codes.json` — coverage report + top unmapped codes (to iterate
  on `election_mappings.json`).

## Notes

- Offline/CLI only — the 6 GB conversion can't run in a web request or fit Railway's
  ephemeral disk. In prod the parquets live on a **Railway volume** at `data/voter_records/`.
- Deferred (built on top later): address geocoding, turnout scores, district
  enrichment, and the contact↔voter matching UI.
