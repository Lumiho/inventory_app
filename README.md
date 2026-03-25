# Inventory Counter App — Project Reference

## Overview

A simple mobile inventory counting app built with **Expo (React Native)** and distributed via **EAS Build**. Designed for counting the same set of tools/items repeatedly, with history tracking and Excel export.

---

## Core Features

### 1. Tap-to-Count Inventory
- Type an item name → it's added with count of 1
- Each subsequent entry of the same name increments by 1
- Per-item **+**, **−**, and **✕** buttons for quick adjustments
- Items are stored as a hashmap (key = item name, value = count)

### 2. Inventory History & Auto-Population
- When you finish an inventory, it's saved with a name and timestamp
- Starting a **new inventory** automatically pre-populates all previously known item names at **count 0**
- Uncounted items appear dimmed and sorted to the bottom
- Any pre-populated item can be removed with ✕ if it's no longer relevant
- View any past inventory in a detail screen
- Long-press a saved inventory to delete it

### 3. Excel Export
- **Export single inventory**: generates `.xlsx` with Item/Count columns and a TOTAL row
- **Export all inventories**: one `.xlsx` file with each inventory as a separate sheet/tab
- Files are named like `inventory_name_2026-03-25.xlsx`
- Uses the native Android/iOS share sheet (email, Drive, WhatsApp, etc.)

---

## Tech Stack

| Layer         | Tool                                      |
|---------------|-------------------------------------------|
| Framework     | Expo (React Native)                       |
| Storage       | @react-native-async-storage/async-storage |
| Excel export  | xlsx (SheetJS)                            |
| File handling | expo-file-system                          |
| Sharing       | expo-sharing                              |
| Build/Deploy  | EAS Build (Expo Application Services)     |

---

## Setup Commands

```bash
npx create-expo-app inventory-counter --template blank
cd inventory-counter
npm install @react-native-async-storage/async-storage expo-sharing expo-file-system xlsx
npm install -g eas-cli
eas login
eas build:configure
```

Then replace `App.js`, `app.json`, and `eas.json` with the code from the artifact.

---

## Config Files

### app.json
```json
{
  "expo": {
    "name": "Inventory Counter",
    "slug": "inventory-counter",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#2563eb"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#2563eb"
      },
      "package": "com.yourname.inventorycounter"
    },
    "plugins": []
  }
}
```

### eas.json
```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

---

## Build & Distribution

### Android (APK — free, easy)
```bash
eas build --profile preview --platform android
```
- Builds in the cloud, gives you a download link for the `.apk`
- Share the APK with coworkers via Drive, email, WhatsApp, etc.
- They install directly — needs "Install from unknown sources" enabled
- Works fully offline, no dev server needed

### iOS Options
- **TestFlight**: Requires Apple Developer account ($99/year). Build with `eas build --profile preview --platform ios`, upload to App Store Connect, invite testers by email.
- **Ad Hoc**: Register each device's UDID, build for those devices. Same $99/year requirement, capped at 100 devices.
- **PWA (free alternative)**: Host a web version, iOS users "Add to Home Screen" from Safari.

### Building on Phone (Android)
Possible via **Termux** (install from F-Droid, not Play Store):
```bash
pkg install nodejs git
```
Then follow normal setup. The EAS build itself runs in the cloud, so the phone just needs to push the project. It works but is slow and awkward on a phone keyboard. A computer is strongly recommended.

**Expo Snack** (snack.expo.dev) can be used in-browser to preview and test the app, but cannot produce an APK.

---

## App Screens

1. **Home** — "New Inventory" button + list of saved inventories with "Export All" option
2. **Naming** — Enter a name for the new inventory
3. **Active Inventory** — The counting screen with input field, item list, +/−/✕ buttons, "Export Excel" and "Save & Finish" at the bottom
4. **Detail View** — Read-only view of a past inventory with "Export to Excel" button

---

## Design Decisions & Notes

- Decrement stops at 0 (doesn't delete the item) so you can see what's left to count
- Items with count > 0 sort to the top by quantity; items at 0 are dimmed and alphabetical at the bottom
- Delete/Clear actions require confirmation dialogs to prevent accidents
- Data persists between app launches via AsyncStorage
- The "auto-populate from history" feature gathers item names from ALL past inventories, not just the most recent one
- Excel column widths are pre-set (30 chars for Item, 10 for Count)
- Sheet names in multi-export are truncated to 20 chars + index to stay within Excel's 31-char limit

---

## Existing Alternatives Considered

- **Sortly, BoxHero, Inventory Now** — Full warehouse systems, overkill for simple tool counting
- **Stock and Inventory Simple, Rapid Inventory** — Closer, but barcode-focused, no auto-populate from history
- **Simple tally counters** — No named items, no history, no export
- This app fills the gap: quick counting + item memory + history + export

---

## Potential Future Features

- Notes/metadata per inventory
- Barcode scanning (expo-barcode-scanner)
- Categories or grouping for items
- Cloud sync between team members
- Photo attachments per item
- PWA version for iOS users without Apple Developer account