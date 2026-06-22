export interface SeedPriceItem {
  description: string;
  unit: string;
  unit_cost: number;
  category: string;
}

export interface SeedAppliance {
  name: string;
  wattage: number;
  category: string;
  default_hours: number;
}

export const SEED_PRICE_ITEMS: SeedPriceItem[] = [
  { description: "Conductor, PV, 4.0mm²", unit: "meters", unit_cost: 100.0, category: "conductor" },
  { description: "Conductor, THHN, 5.5mm²", unit: "meters", unit_cost: 80.0, category: "conductor" },
  { description: "Conductor, THHN, 8.0mm²", unit: "meters", unit_cost: 125.0, category: "conductor" },
  { description: "Conductor, Battery, 35mm²", unit: "meters", unit_cost: 450.0, category: "conductor" },
  { description: "Connector, MC4, Set", unit: "Pcs", unit_cost: 90.0, category: "conductor" },
  { description: "Conductor, Grounding", unit: "Pcs", unit_cost: 145.0, category: "grounding" },
  { description: "Grounding Rod, with Clamp", unit: "Pc", unit_cost: 1500.0, category: "grounding" },
  { description: "Lug, PV Grounding", unit: "Pcs", unit_cost: 50.0, category: "grounding" },
  { description: "Cable Tray, Aluminum", unit: "Pcs", unit_cost: 660.0, category: "railing" },
  { description: "Connector, PV Railings", unit: "Pcs", unit_cost: 80.0, category: "railing" },
  { description: "PV Clamp, End", unit: "Pcs", unit_cost: 50.0, category: "railing" },
  { description: "PV Clamp, Mid", unit: "Pcs", unit_cost: 50.0, category: "railing" },
  { description: "PV Mounting Bracket, L Foot", unit: "Pcs", unit_cost: 90.0, category: "railing" },
  { description: "PV Roof Railings, 2.4m", unit: "Pcs", unit_cost: 900.0, category: "railing" },
  { description: "Circuit Breaker, 125AT, DC", unit: "Pc", unit_cost: 1800.0, category: "protection" },
  { description: "Circuit Breaker, 20AT, DC", unit: "Pcs", unit_cost: 500.0, category: "protection" },
  { description: "Circuit Breaker, 63AT, AC", unit: "Pcs", unit_cost: 300.0, category: "protection" },
  { description: "Automatic Transfer Switch, 125A", unit: "Pcs", unit_cost: 2600.0, category: "protection" },
  { description: "Distribution Box, 15 Ways", unit: "Pcs", unit_cost: 1000.0, category: "protection" },
  { description: "Electrical Conduit, HDPE Spiral, 32mm", unit: "Pcs", unit_cost: 120.0, category: "protection" },
  { description: "Enclosure, Metal, 300x300x160mm", unit: "Pcs", unit_cost: 2600.0, category: "protection" },
  { description: "Surge Protection Device (SPD), AC", unit: "Pcs", unit_cost: 1350.0, category: "protection" },
  { description: "Surge Protection Device (SPD), DC", unit: "Pcs", unit_cost: 1350.0, category: "protection" },
  { description: "Battery, 5kWhr, Lithium, 6000 Cycle", unit: "Unit", unit_cost: 50000.0, category: "major" },
  { description: "Battery, 10kWhr, Lithium, 6000 Cycle", unit: "Unit", unit_cost: 85000.0, category: "major" },
  { description: "Battery, 15kWhr, Lithium, 6000 Cycle", unit: "Unit", unit_cost: 110000.0, category: "major" },
  { description: "Inverter, 6kW, Gridtie, Solis", unit: "Unit", unit_cost: 31000.0, category: "major" },
  { description: "Inverter, 8kW, Gridtie, Solis", unit: "Unit", unit_cost: 47000.0, category: "major" },
  { description: "Inverter, 6kW, Hybrid, Deye", unit: "Unit", unit_cost: 51000.0, category: "major" },
  { description: "Inverter, 8kW, Hybrid, Deye", unit: "Unit", unit_cost: 67000.0, category: "major" },
  { description: "Inverter, 12kW, Hybrid, Deye", unit: "Unit", unit_cost: 94000.0, category: "major" },
  { description: "Inverter, 16kW, Hybrid, Deye", unit: "Unit", unit_cost: 127000.0, category: "major" },
  { description: "Inverter, 18kW, Hybrid, Deye", unit: "Unit", unit_cost: 158000.0, category: "major" },
  { description: "Solar Panel, 620W, Monocrystalline", unit: "Pcs", unit_cost: 6200.0, category: "major" },
  { description: "Other Materials and Consumables (Screw, Clamps, Sealant, Terminal Lugs and Others)", unit: "Lot", unit_cost: 2200.0, category: "other" },
];

export const SEED_APPLIANCES: SeedAppliance[] = [
  { name: "Air Conditioner, 1.0 HP", wattage: 1000, category: "cooling", default_hours: 9 },
  { name: "Air Conditioner, 1.5 HP", wattage: 1500, category: "cooling", default_hours: 9 },
  { name: "Air Conditioner, 2.0 HP", wattage: 2000, category: "cooling", default_hours: 9 },
  { name: "Refrigerator, Standard", wattage: 150, category: "kitchen", default_hours: 24 },
  { name: "Rice Cooker", wattage: 700, category: "kitchen", default_hours: 3 },
  { name: "Microwave Oven", wattage: 1000, category: "kitchen", default_hours: 0.5 },
  { name: "Electric Iron", wattage: 1000, category: "kitchen", default_hours: 0.5 },
  { name: "Water Pump, 0.5 HP", wattage: 375, category: "water", default_hours: 2 },
  { name: "Water Pump, 1.0 HP", wattage: 750, category: "water", default_hours: 4 },
  { name: "Water Heater", wattage: 1500, category: "water", default_hours: 0.5 },
  { name: "LED TV, 32\"", wattage: 60, category: "entertainment", default_hours: 6 },
  { name: "LED TV, 43\"", wattage: 80, category: "entertainment", default_hours: 8 },
  { name: "LED TV, 55\"", wattage: 120, category: "entertainment", default_hours: 15 },
  { name: "Desktop Computer", wattage: 150, category: "entertainment", default_hours: 8 },
  { name: "Laptop", wattage: 60, category: "entertainment", default_hours: 8 },
  { name: "LED Bulb, 9W", wattage: 9, category: "lighting", default_hours: 8 },
  { name: "Fluorescent Lamp, 20W", wattage: 20, category: "lighting", default_hours: 8 },
  { name: "Electric Fan", wattage: 75, category: "other", default_hours: 12 },
  { name: "Washing Machine", wattage: 500, category: "other", default_hours: 1 },
];
