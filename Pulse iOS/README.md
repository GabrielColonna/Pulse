# Pulse iOS

Native offline-first SwiftUI port of the Pulse budget dashboard.

## Open The Project

1. Install [XcodeGen](https://github.com/yonaskolb/XcodeGen) if needed:
   ```bash
   brew install xcodegen
   ```
2. Generate the Xcode project:
   ```bash
   cd "Pulse iOS"
   xcodegen generate
   ```
3. Open `Pulse.xcodeproj` in Xcode.
4. Select an iPhone simulator and press **Run**.

## Preview In Xcode

1. Open `Pulse.xcodeproj` (regenerate first if missing: `xcodegen generate`)
2. Open one of these files:
   - `Pulse/Views/ModalViews.swift` — Privacy Gate, populated/empty Dashboard, Quick Add, Import, Settings, and Savings previews
   - `Pulse/Views/FeatureViews.swift` — Monthly Log and Global Search previews
   - `Pulse/Views/RootView.swift` — full app shell preview
3. Enable **Editor → Canvas** (or press `⌥⌘↩`)
4. Choose a preview from the picker (e.g. **Dashboard**)

Previews use in-memory sample data via `PreviewSupport.swift`, so they do not require unlocking the PIN or loading disk data.

If Preview still fails, run **Product → Clean Build Folder**, then build once (`⌘B`) before reopening the canvas.

## Default PIN

The privacy gate uses the same default PIN as the web app: `0307`.

The app locks again when it moves to the background. A fresh launch always requires the PIN.

## Data Storage

All data is stored locally with SwiftData:
- Transactions
- Trips
- Category model customizations
- Savings goals

No network connection is required.

## Feature Parity

The native app preserves the web dashboard behavior:
- PIN gate
- Yearly and monthly KPI cards
- Category doughnut chart with subcategory breakdown
- Month navigation and monthly log with bulk delete
- Quick Add with keyword categorization, trips, and recurrence
- Global search
- Trip summary and trip management
- Category settings editor with keywords
- Savings goal tracker and insights
- CSV/XLSX import with editable column mapping, row correction, and duplicate skipping
- Multi-sheet XLSX export and backup CSV via share sheet
- Clear-all confirmation flow

## Import / Export

- **Import:** Dashboard → Data → Import Data
- **Export:** Dashboard → Data → Export Data (`.xlsx`, Summary plus monthly sheets)
- **Backup:** Dashboard → Data → Backup Data (`.csv`)

CSV/XLSX import supports editable mappings, category corrections, existing-data duplicates, and duplicates within the selected file.

## Tests

```bash
xcodebuild -project Pulse.xcodeproj -scheme Pulse -destination 'platform=iOS Simulator,name=iPhone 17 Pro' test
```

Unit tests cover classification, recurrence, analytics, savings, import parsing/commit, duplicate detection, model container creation, privacy preferences, and XLSX creation. UI smoke tests cover PIN behavior, dashboard loading, and opening Quick Add.

## Project Layout

```
Pulse iOS/
├── project.yml
├── Pulse/
│   ├── PulseApp.swift
│   ├── Models/
│   ├── Services/
│   ├── ViewModels/
│   ├── Views/
│   ├── Theme/
│   └── Resources/
├── PulseTests/
└── PulseUITests/
```

## Notes

- The original web app in the repo root is unchanged and remains the reference implementation.
- Fraunces and Space Grotesk are bundled under `Pulse/Resources/Fonts/` to match the web typography without a network dependency.
