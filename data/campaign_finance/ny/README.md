# New York Campaign Finance Data

## Overview

This directory contains campaign finance data from the New York State Board of Elections (NY BOE), including:
- **Committee/Candidate Registry** (`COMMCAND.CSV`) - Master list of all registered committees
- **Disclosure Files** (`disclosures/*.csv`) - Individual contribution records organized by filing period
- **Parquet Conversions** - Optimized versions for faster querying

## Data Sources

**Official Source**: New York State Board of Elections  
**URL**: https://www.elections.ny.gov/CampaignFinance.html  
**Update Frequency**: Multiple filing periods per year

## File Structure

```
ny/
├── COMMCAND.CSV                    # Committee registry (authoritative source)
├── committees.parquet              # Converted committee registry (point-in-time snapshot)
├── committees_schema.json          # Schema documentation for COMMCAND.CSV
└── disclosures/
    ├── schema.json                 # Schema documentation for disclosure files
    ├── data.parquet                # All disclosures converted to single parquet file
    ├── 2024gen.csv                 # General Election 2024 filing period
    ├── 2024pri.csv                 # Primary Election 2024 filing period
    ├── 2025jan.csv                 # January 2025 periodic filing
    ├── 2025jul.csv                 # July 2025 periodic filing
    └── ...                         # Additional filing periods
```

## Filing Periods

NY BOE requires periodic filings throughout the year:

- **jan** - January periodic filing (January 15)
- **march** - Spring periodic filing (~March)
- **jul** - July periodic filing (July 15)
- **pri** - Primary election filing
- **gen** - General election filing
- **ghi** - Post-general filing
- **offcycle** - Off-cycle/special elections

## Data Format

### Committee Registry (COMMCAND.CSV)

- **Format**: Headerless CSV
- **Columns**: 17+ documented columns (see `committees_schema.json`)
- **Key Fields**: Committee ID, Name, Type, Status, Treasurer, Address
- **Primary Key**: Committee ID (column 0)

### Disclosure Files (disclosures/*.csv)

- **Format**: Headerless CSV
- **Columns**: 54+ columns (see `disclosures/schema.json`)
- **Key Fields**: Filer ID, Donor Name, Amount, Date, Address, Employer, Occupation
- **Record Type**: Individual contributions only (not expenditures)

## Schema Files

### `committees_schema.json`

Documents the structure of `COMMCAND.CSV`:
- Column positions and names
- Data types
- Field descriptions
- Value mappings for coded fields
- Application field mapping

### `disclosures/schema.json`

Documents the structure of disclosure CSV files:
- 54 documented column positions
- Known fields vs unknown/unmapped fields
- Data types and formats
- Application field mappings

## Data Quality Notes

1. **Headerless Format**: All NY BOE files are headerless - column positions are fixed but not labeled
2. **Incomplete Documentation**: Many column positions are unknown/undocumented by NY BOE
3. **Malformed Rows**: Some CSV rows may have parsing errors - use `ignore_errors=true` in DuckDB queries
4. **Date Formats**: Dates appear in various formats and require normalization
5. **Missing Data**: Employer/occupation fields are often empty for small donors
6. **Committee Matching**: Use fuzzy matching for committee IDs (see `campaignFinance.ts`)

## Usage in Application

### DuckDB Queries

The application uses DuckDB to query these files directly:

```typescript
// Disclosures query
SELECT * FROM 'data/campaign_finance/ny/disclosures/*.csv'
WHERE column25 ILIKE '%SMITH%'  -- Donor last name
  AND column36 > 1000           -- Amount > $1000

// Committee lookup
SELECT * FROM 'data/campaign_finance/ny/COMMCAND.CSV'
WHERE column0 = '19576'         -- Committee ID
```

### Parquet Conversion

For faster queries, CSV files are converted to Parquet:

```bash
# This is done automatically by the application when needed
# disclosures/*.csv → disclosures/data.parquet
# COMMCAND.CSV → committees.parquet
```

### Column References

When querying headerless CSVs, DuckDB auto-assigns column names:
- Single-digit columns: `column0`, `column1`, ..., `column9`
- Double-digit columns: `column10`, `column11`, ..., `column99`

**Important**: Always use the helper function `findColumnByIndex()` in `campaignFinance.ts` to resolve the correct DuckDB column name, as the naming pattern changes at column 10.

## Committee Route IDs

The application uses a composite route ID format for committees:

**Format**: `{state}-{committeeId}`  
**Example**: `ny-19576`

This allows:
- Multi-state support with unique IDs
- Clean URL routing (`/campaign-finance/committee/ny-19576`)
- Easy state extraction from route parameters

## Future State Support

When adding new states:

1. Create `data/campaign_finance/{state}/` directory
2. Add schema files (committees and disclosures)
3. Update `MANUAL_STATE_COLUMN_INDEX_MAPPINGS` in `campaignFinance.ts`
4. Add state-specific parsing logic if needed
5. Document any state-specific quirks in schema notes

## Related Documentation

- **Application Code**: `app/actions/campaignFinance.ts`
- **UI Components**: `app/campaign-finance/`
- **DuckDB Integration**: `lib/duckdb.ts`

## Column Mapping Reference

### Disclosure Files (Key Columns Only)

| Index | Field Name | Application Mapping | Description |
|-------|------------|---------------------|-------------|
| 0 | filer_id | committeeId | Recipient committee ID |
| 2 | cand_comm_name | committeeName | Recipient name |
| 3 | election_year | electionYear | Election year (e.g., 2026, 2025, 2024) |
| 4 | election_type | electionType | Election type (State/Local, Village, County) |
| 5 | county_name | (not mapped) | County name (only when election_type is County) |
| 6 | disclosure_period_abbrev | disclosurePeriod | Disclosure period code (A-M) |
| 7 | disclosure_period_name | (not mapped) | Disclosure period full name |
| 9 | filing_category_desc | filingCategory | Filing category (Itemized, No Activity) |
| 10 | filing_sched_abbrev | filingScheduleCode | Filing schedule code (A, C, D, etc.) |
| 11 | filing_sched_desc | filingScheduleDescription | Filing schedule description (Monetary Contributions/Receipts, In-Kind Contributions, etc.) |
| 15 | contribution_date | date | Contribution date |
| 24 | flng_ent_name | organizationName | Organization/entity contributor name (if not individual) |
| 25 | flng_ent_first_name | donorFirstName | Donor first name |
| 26 | flng_ent_mid_init | donorMiddleName | Donor middle initial |
| 27 | flng_ent_last_name | donorLastName | Donor last name |
| 28 | flng_ent_add1 | street | Donor street address |
| 29 | flng_ent_city | city | Donor city |
| 30 | flng_ent_state | state | Donor state |
| 31 | flng_ent_zip | zip | Donor ZIP code |
| 36 | org_amt | amount | Contribution amount |
| 52 | flng_ent_employer | employer | Donor employer |
| 53 | flng_ent_occupation | occupation | Donor occupation |

### Committee Registry (COMMCAND.CSV)

| Index | Field Name | Application Mapping | Description |
|-------|------------|---------------------|-------------|
| 0 | committee_id | committeeId | Unique committee ID |
| 1 | committee_name | committeeName | Committee/candidate name |
| 2 | filer_type | filerType | Candidate/Committee/Party |
| 3 | filing_level | filingLevel | State/County/Local |
| 4 | status | status | Active/Terminated/Suspended |
| 5 | committee_type | committeeType | Type of committee |
| 8 | county | county | County name |
| 9 | municipality | municipality | City/town name |
| 10-12 | treasurer_* | treasurer* | Treasurer name components |
| 13 | address_line_1 | addressLine1 | Committee address |
| 14-16 | city/state/zip | city/addressState/zip | Committee location |

## Maintenance

- **COMMCAND.CSV**: Download latest version from NY BOE periodically
- **Disclosure Files**: Add new files as they become available from NY BOE
- **Parquet Files**: Regenerate after adding new CSV files
- **Schema Updates**: Document new columns if identified through BOE documentation
