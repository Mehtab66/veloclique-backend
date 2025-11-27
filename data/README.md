# Data Folder Structure

You can organize your CSV files in any folder structure. The import script will automatically find all CSV files in subdirectories.

## Recommended Structure

```
data/
├── locations/
│   ├── Alaska_County_City_ZIP.csv
│   ├── Arizona_County_City_ZIP.csv
│   ├── California_County_City_ZIP.csv
│   └── ...
├── businesses/
│   ├── alaska_vc_data.csv
│   ├── arizona_vc_data.csv
│   ├── california_vc_data.csv
│   └── ...
└── README.md
```

## Alternative Structure (by State)

```
data/
├── alaska/
│   ├── Alaska_County_City_ZIP.csv
│   └── alaska_vc_data.csv
├── arizona/
│   ├── Arizona_County_City_ZIP.csv
│   └── arizona_vc_data.csv
└── ...
```

## Usage

The import script will automatically find all CSV files regardless of folder structure:

```bash
# Import from data folder (default)
npm run import:all

# Import from custom folder
npm run import:all "d:\Personal Projects\backend data"

# Import from relative path
npm run import:all ./data
```

The script recursively searches all subdirectories, so you can organize files however you prefer!

