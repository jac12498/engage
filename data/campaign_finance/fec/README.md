# FEC (Federal) Campaign-Finance Data

Federal Election Commission bulk data, converted to parquet for DuckDB queries.
Built **offline** (the individual-contribution zips are multiple GB) via:

```
npm run finance:generate-fec
```

## Source files (download from the FEC bulk-data site, place them here)

| File | What it is |
|------|-----------|
| `candidate_summary_{year}.csv` | Candidate financial summaries, one per cycle (comma, headered) |
| `committees-{datetime}.csv` | Committee master snapshot (comma, headered; PG-array columns) |
| `ccl{YY}.zip` | Candidate↔committee linkage, one per cycle (pipe-delimited `ccl.txt`) |
| `indiv{YY}.zip` | Individual contributions, one per cycle — **GBs** (pipe-delimited, 21 cols, no header) |

## Output parquets (ZSTD, gitignored)

- `candidates.parquet` — all cycles, `cycle` column added.
- `committees.parquet` — committee master (array columns parsed to lists).
- `ccl.parquet` — candidate↔committee linkage, all cycles.
- `indiv_{year}.parquet` — individual contributions, **2024 + 2026 only**, filtered to
  `ENTITY_TP = 'IND'` (people, not orgs), sorted by state. Named columns:
  `cmte_id, name, city, state, zip_code, employer, occupation, transaction_dt,
  transaction_amt, other_id, tran_id, memo_cd`. The FEC `name` is `LAST, FIRST MIDDLE`.

## Notes

- Windows-oriented: zip extraction uses PowerShell. This is a dev/offline admin step.
- The built parquets are large and **gitignored**; in production they live on a
  **Railway volume** mounted at `data/campaign_finance/` (they can't be committed
  or fit ephemeral disk).
- `data.parquet`-style refresh: delete a `.parquet` to force it to rebuild.
- Contact↔donation matching queries `indiv_*.parquet` on donor `name` + city/state/zip
  and joins `committees`/`candidates` to show the recipient. (Next phase.)
