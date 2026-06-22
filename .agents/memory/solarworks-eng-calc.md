---
name: SolarWorks engineering calculations
description: Validated formulas for solar PV system sizing and BOQ generation in SolarWorks Zambales app
---

## Panel Count

`numPanels = ceil((systemKw * 1000) / (panelW * 0.8))`, then round up to even number.

## Mounting

- Rails per row = ceil((2 × panelsPerRow × panelWidth) / (railLength + gaps))
- L-Foot brackets = 4 × totalRails
- Rail connectors = (railsPerRow/2 - 1) × 2 × numRows
- End clamps = 4 × numRows, Mid clamps = (panelsPerRow - 1) × 2 × numRows

## Pricing (BOQ)

- Installation = 30% of (materialSubtotal + mobilization)
- Mobilization = flat ₱5,000
- Total = materialSubtotal + mobilization + installation (VAT exclusive)

## Optimal Tilt

- Year-round: 0.76 × |lat| + 3.1°
- Summer: max(|lat| - 15°, 5°)
- Winter: |lat| + 15°

## Energy Sizing

- Required kWp = dailyKwh / (PSH × 0.85 × 0.8)
- PSH for Zambales = 5.5 h/day
- Battery sizing: (dailyKwh × backupDays) / 0.8

## Validation

6kW Hybrid, 620W panels, 2 rows, 15kWh battery → 12 panels, total ≈ ₱392,177 at seed prices.
