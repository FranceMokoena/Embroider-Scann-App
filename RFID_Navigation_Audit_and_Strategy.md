# RFID Navigation Audit and Hybrid Guidance System Strategy

## Overview

This document provides a full cross-screen architectural audit of the current RFID system in the Embroider Scann App, plus a recommended hybrid RF/motion-based asset guidance strategy optimized for Chainway C66.

It is intentionally designed as a copy-paste-ready briefing for ChatGPT or an architecture discussion.

---

## 1. Current System Architecture

### Architecture Diagram

```
[Chainway C66 Hardware]
        |
        v
[NATIVE SDK / Expo Native Module]
        |
        v
[src/rfid/chainwayRfid.ts]
        |
        v
[src/rfid/useRfidListener.ts]
        |
        v
[src/rfid/RFIDStreamController.ts]
        |
        +--> [RFID screens subscribe via useRFIDStreamController]
        |           - LocateAssetScreen
        |           - SearchAssetScreen
        |           - SearchAsset
        |           - VerifyAsset
        |           - AssignTag
        |           - RFIDHomeScreen
        |
        v
[src/screens/rfid/hooks/useCampusProximityTracker.ts]
        |
        v
[src/screens/rfid/components/CampusTrackingMap.tsx]
        |
        v
[UI Layer]
        |
        +--> [ERP lookup via src/config/api.ts]
        |           - /api/assets
        |           - /api/rfid/lookup
        |           - /api/rfid/scan-log
        |
        +--> [Asset sync via src/services/assetSync.ts]
                    - section transfer refresh
                    - asset updated events
```

### Core Modules

- `LocateAssetScreen.tsx`
- `RFIDStreamController.ts`
- `useCampusProximityTracker.ts`
- `CampusTrackingMap.tsx`
- `chainwayRfid.ts`
- `useRfidListener.ts`
- `src/config/api.ts`
- `src/services/assetApi.ts`
- `src/services/assetSync.ts`
- backend `rfid` routes and controllers

---

## 2. Cross-Screen Audit

### 2.1 LocateAssetScreen

- Search flow supports EPC, asset number, serial number, asset name, and section.
- Uses `apiRequest()` as ERP lookup, plus `/api/rfid/lookup/:epc` for RFID-based asset resolution.
- `Scan EPC` starts native scanning via `RFIDStreamController`.
- `isTracking` toggles when a located asset is present.
- Uses `useCampusProximityTracker()` to generate proximity state.
- UI transitions are between idle, searching, and tracking.

### 2.2 SearchAssetScreen

- Implements listening for matching EPCs from a target asset list.
- Uses `useRFIDStreamController()` for scan lifecycle.
- Detects matching EPCs in stream entries and stops scan after match.
- This is the closest existing model to target lock.

### 2.3 SearchAsset

- Simpler search screen.
- Captures EPCs and auto-fills search input.
- No proximity guidance.

### 2.4 VerifyAsset

- Builds room/section audit workflows.
- Captures tags into a verification list.
- Uses `useSectionAwareRefresh()` to update audit after section transfers.
- No navigation guidance.

### 2.5 AssignTag

- Bulk tag capture and assignment UI.
- Uses the same scan lifecycle for recording EPCs.
- No guidance features.

### 2.6 RFIDHomeScreen

- Dashboard-style RFID monitor.
- Writes scan logs to backend for every seen entry.
- Resolves EPCs via `/api/rfid/lookup/:epc`.
- Not a guidance interface; it is raw stream monitoring.

### 2.7 RFIDStreamController

- Global singleton managing one active scan owner.
- Starts/stops native scan using `ChainwayRfid`.
- Handles app lifecycle background/resume.
- Maintains scan lifecycle states: `idle`, `starting`, `scanning`, `paused`, `stopping`.
- Buffers events and flushes every 150 ms.
- Limits visible snapshot entries to 200.
- Duplicate suppression in JS using time windows.

### 2.8 useRfidListener

- Native event listener wrapper with debounce.
- Suppresses duplicate EPCs within 1200 ms.
- Emits batches to controller callbacks.

### 2.9 useCampusProximityTracker

- Computes a proximity score based on:
  - recency of target tag
  - burst count
  - total read count
- Uses a 2.5 s sliding window.
- Builds a synthetic signal state and guidance text.
- Returns a fake technician position interpolated to a fixed asset anchor.

### 2.10 CampusTrackingMap

- Purely visualization-focused.
- Renders a static grid, animated pulse, and two artificial dots.
- No real spatial mapping.
- Asset and technician positions are synthetic.

### 2.11 chainwayRfid / native bridge

- Exposes only basic scan commands and event listening.
- `RfidTagScannedEvent` includes only `epc` and `timestamp`.
- No RSSI, antenna ID, power, or motion sensors currently exposed.

### 2.12 Backend ERP + RFID layer

- `/api/rfid/lookup/:epc` resolves tag to asset.
- `/api/rfid/scan-log` records scans.
- `/api/rfid/assign` links tag to asset.
- `/api/assets` is the main ERP registry search.
- `assetSync.ts` publishes in-app asset update events.
- `useSectionAwareRefresh()` refreshes on section transfer events.
- No backend navigation or zone metadata support.

---

## 3. Current System Limitations

### Tracking and Guidance Limitations

- No RSSI utilization in the current implementation.
- No antenna or signal strength metadata is processed.
- No motion sensor integration at all.
- No navigation intelligence layer beyond simple proximity score.
- No anchor or zone-based location detection.
- No directional estimation.
- Map is not spatially grounded.
- Current map is a UI metaphor, not a real route map.
- Target lock is simplistic and based on matching EPC only.
- No path or turn-by-turn guidance.

### Signal Processing Gaps

- Proximity engine uses only read count and recency.
- No signal normalization or RSSI conversion.
- No EMA / Kalman / smoothing beyond window sums.
- Synthetic positioning gives false confidence.
- No confidence or state hysteresis.

### Performance and Safety Gaps

- `entriesByEpc` isn’t capped; snapshot limit can hide older entries.
- UI can rerender too often if raw scan events are too frequent.
- No native target filtering to reduce event noise.
- App relies on active scan ownership; screens may clash.
- No explicit battery-aware guidance mode.

### Backend Gaps

- ERP layer lacks any zone or anchor support.
- No endpoint for location guidance or section zone metadata.
- No real-time navigation update channel.

---

## 4. Hybrid Navigation Architecture

The appropriate system is:

> RF signal-driven + motion-assisted + ERP-aligned guidance system.

Not a full indoor GPS-style mapping system.

### 4.1 RF Signal Engine

**Goals:** extract usable signal intelligence from Chainway C66 events.

**Required capabilities:**

- RSSI processing (if available)
- antenna ID support
- read count density analysis
- RF power variation awareness
- time-based smoothing
- false-tag noise reduction
- event throttling for UI stability

**Output:**

- normalized signal strength
- density-based confidence score
- filtered target EPC events
- signal health diagnostics

### 4.2 Proximity Intelligence Layer

**Goals:** produce stable guidance states.

**Capabilities:**

- target EPC locking
- hot/warm/cold/very-hot classification
- geiger counter mode
- confidence scoring
- signal state hysteresis

**Output:**

- `Cold`, `Warm`, `Hot`, `Very Hot`, `Found`
- `proximityPercent`
- guidance hints
- target lock status

### 4.3 Motion Analysis Layer

**Goals:** incorporate device movement and heading.

**Capabilities:**

- accelerometer movement detection
- gyroscope turn detection
- compass or heading support
- movement trend analysis

**Output:**

- `moving / stationary`
- `heading change`
- `move forward / turn left / pivot right`
- direction-aware guidance

### 4.4 ERP Section Mapper

**Goals:** tie RF guidance to logical ERP zones.

**Capabilities:**

- map asset metadata to logical zones
- map tag signal state into section/room zones
- use ERP section data to narrow search space

**Output:**

- current zone hint
- target section context
- asset section validation

### 4.5 Navigation UI Layer

**Goals:** surface guidance clearly without needing full indoor maps.

**Capabilities:**

- directional arrow or compass indicator
- signal strength meter
- heatmap-like proximity bar
- live target confidence badges
- audio beep/beacon mode
- zone status display

**Output:**

- a professional, enterprise guidance experience
- actionable technician feedback
- visible/aural signal state

---

## 5. Phased Implementation Roadmap

### Phase 1 — Immediate Value

- Upgrade proximity engine in `useCampusProximityTracker`.
- Add signal smoothing and stable score output.
- Add explicit target EPC lock support in `RFIDStreamController`.
- Add a geiger counter mode with cold/warm/hot states.
- Improve `CampusTrackingMap` from metaphor to guidance dashboard.
- Keep `LocateAssetScreen` as the search-and-guide entry point.

### Phase 2 — Motion-Assisted Enhancement

- Add motion sensor support in native bridge if available.
- Expose accelerometer/gyro/compass data to JS.
- Implement directional movement hints in UI.
- Add optional audio/vibration feedback.

### Phase 3 — Anchor/Zone Refinement

- Introduce fixed RFID anchor tags for entrances, corridors, sections.
- Add zone metadata to backend.
- Use anchor detections to refine location and snap to zone.
- Use ERP section mapping to narrow guidance.

### Phase 4 — Optional Spatial Layer

- Add a lightweight zone graph only if needed.
- Keep it logical, not full GIS.
- Use it for zone transitions, not as the primary guidance method.

---

## 6. Recommended File-Level Changes

### Core engine files

- `src/rfid/chainwayRfid.ts`
  - add richer scan event fields: RSSI, antenna, power, timestamp precision
  - expose motion sensor data if native SDK supports it
- `src/rfid/useRfidListener.ts`
  - accept richer event payloads
  - add advanced duplicate suppression by tag and signal
- `src/rfid/RFIDStreamController.ts`
  - add `targetEpc` filter functions
  - support signal-focused scan state
  - cap internal entry memory and keep target-only summary
  - expose guidance and motion state

### Proximity / guidance files

- `src/screens/rfid/hooks/useCampusProximityTracker.ts`
  - rename or extend to `useRfidGuidanceEngine.ts`
  - support EMA/Kalman smoothing
  - output geiger label, confidence, and motion-aware hints
- `src/screens/rfid/components/CampusTrackingMap.tsx`
  - redesign to show zone guidance, direction, and confidence
  - keep visuals lightweight

### Screen files

- `src/screens/rfid/LocateAssetScreen.tsx`
  - make it the hybrid guidance entry screen
  - add guidance state panel and audio toggle
- `src/screens/rfid/SearchAssetScreen.tsx`
  - reuse guidance engine for target listening
- `src/screens/rfid/SearchAsset.tsx`
  - same target listening improvements
- `src/screens/rfid/VerifyAsset.tsx`
  - use refined capture guidance for audit flows
- `src/screens/rfid/AssignTag.tsx`
  - preserve capture workflow; optionally reuse scan engine
- `src/screens/rfid/RFIDHomeScreen.tsx`
  - continue raw monitoring; optionally display signal summary

### Backend changes

- `backend/src/routes/rfid.js`
  - add endpoints for anchor/zone metadata and navigation hints
- `backend/src/controllers/rfidController.js`
  - expose asset location zone endpoints
- `src/services/assetApi.ts`
  - add methods for zone/section guidance
- `src/services/assetSync.ts`
  - add navigation-relevant events

---

## 7. Performance & Safety Constraints

### Performance requirements

- support 1300+ tags/sec native scanning.
- throttle JS state updates to 200–500 ms.
- filter data before feeding UI.
- keep UI rerenders minimal.

### Safety goals

- preserve battery life by controlling active scan state.
- pause inventory in background.
- avoid always-on high-power scanning.
- keep guidance simple and robust.

### Practical rule

- Do not make GPS-style indoor coordinates the primary solution.
- The system should remain an RFID signal-driven hybrid guidance system.
- Motion-aware hints and ERP zone context are secondary enhancements.

---

## 8. Summary

The current app is a strong RFID asset search and capture system, but it lacks a true navigation engine.

The correct transformation is:

- Level 1: signal-based navigation
- Level 2: motion-assisted guidance
- Level 3: optional RFID anchor zone refinement

This document defines the architecture, limitations, and rollout path for that hybrid RFID navigation system.
