# Documentation Versioning Strategy

To ensure critical documentation is preserved and historical changes are tracked, we employ a timestamp-based versioning strategy.

## Directory Structure

All documentation is stored in the `docs/` directory at the project root.

```
project-root/
└── docs/
    ├── DOCUMENTATION_STRATEGY.md (This file)
    ├── YYYYMMDD_HHMMSS_ms-TECHNICAL_SPECIFICATIONS-v1.md
    ├── YYYYMMDD_HHMMSS_ms-TECHNICAL_SPECIFICATIONS-v2.md
    └── ...
```

## Naming Convention

Files are named using the following format:

`YYYYMMDD_HHMMSS_ms-FILENAME-vX.md`

- **YYYYMMDD**: Year, Month, Day (e.g., 20260128)
- **HHMMSS**: Hour, Minute, Second (e.g., 233515)
- **ms**: Milliseconds (e.g., 000)
- **FILENAME**: The original filename (e.g., TECHNICAL_SPECIFICATIONS)
- **vX**: Version number (e.g., v1, v2)

## Workflow

1.  **Create/Update**: When a critical document needs to be updated, do not overwrite the existing file.
2.  **Snapshot**: Create a new file with the current timestamp and incremented version number.
3.  **Content**: Write the new content into this new file.
4.  **Reference**: Always refer to the latest version (highest vX) as the source of truth.

## Automation (Future)

Future improvements may include a script to automate this process, ensuring consistent timestamp generation and version incrementing.
