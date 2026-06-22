export interface MountingResult {
  railsPerRow: number;
  totalRails: number;
  lFootBrackets: number;
  railConnectors: number;
  endClamps: number;
  midClamps: number;
  cableTrayPcs: number;
  groundingCondPcs: number;
}

export interface ElecResult {
  pvWireLengthM: number;
  thhn55LengthM: number;
  thhn80LengthM: number;
  battCableLengthM: number;
  mc4Sets: number;
  groundingRods: number;
  pvGroundingLugs: number;
  mainDcCbQty: number;
  dcStringCbQty: number;
  acCbQty: number;
  atsQty: number;
  distBoxQty: number;
  conduitQty: number;
  enclosureQty: number;
  spdAcQty: number;
  spdDcQty: number;
}

export interface BOQResult {
  numPanels: number;
  mounting: MountingResult;
  electrical: ElecResult;
  panelCost: number;
  inverterCost: number;
  batteryCost: number;
  group1: number;
  group2: number;
  group3: number;
  group4: number;
  otherCost: number;
  materialSubtotal: number;
  mobilization: number;
  installation: number;
  total: number;
  inverterKey: string;
  batteryKey: string;
}

export interface ApplianceLoad {
  wattage: number;
  qty: number;
  hoursPerDay: number;
  name: string;
}

export interface EnergyResult {
  dailyKwh: number;
  recommendedKwp: number;
  batteryRecs: Record<string, number>;
  estimatedGenKwh: number;
}

export class EngCalc {
  static computeNumPanels(systemKw: number, panelW: number): number {
    // Floor so panel array never exceeds inverter rated power
    // (panels × panelW × 0.8 ≤ inverterKw × 1000)
    const raw = Math.floor((systemKw * 1000) / (panelW * 0.8));
    // Round DOWN to nearest even (panels wired in strings of 2)
    const n = raw % 2 !== 0 ? raw - 1 : raw;
    return Math.max(n, 2);
  }

  static panelDimensions(panelW: number): { width: number; length: number } {
    const dims: Record<number, { width: number; length: number }> = {
      400: { width: 1.0, length: 1.72 },
      420: { width: 1.048, length: 1.72 },
      540: { width: 1.134, length: 2.094 },
      580: { width: 1.134, length: 2.274 },
      620: { width: 1.134, length: 2.382 },
    };
    return dims[panelW] ?? { width: 1.134, length: 2.382 };
  }

  static computeMounting(numPanels: number, panelW: number, numRows: number): MountingResult {
    const panelsPerRow = Math.floor(numPanels / numRows);
    const panelWidth = EngCalc.panelDimensions(panelW).width;
    const railLength = 2.4;
    const gapM = 0.025;

    const totalGap = (panelsPerRow + 1) * gapM;
    const railsRaw = (2 * (panelsPerRow * panelWidth)) / (railLength + totalGap);
    let railsPerRow = Math.ceil(railsRaw);
    if (railsPerRow % 2 !== 0) railsPerRow += 1;

    const totalRails = railsPerRow * numRows;
    const lFootBrackets = 4 * totalRails;
    const railConnectors = (Math.floor(railsPerRow / 2) - 1) * 2 * numRows;
    const endClamps = 4 * numRows;
    const midClamps = (panelsPerRow - 1) * 2 * numRows;

    return {
      railsPerRow,
      totalRails,
      lFootBrackets,
      railConnectors,
      endClamps,
      midClamps,
      cableTrayPcs: 2,
      groundingCondPcs: 20,
    };
  }

  static nextDcCbSize(minA: number): number {
    const standards = [15, 20, 25, 30, 40, 50];
    return standards.find((s) => s >= minA) ?? 50;
  }

  static nextAcCbSize(minA: number): number {
    const standards = [20, 30, 40, 50, 63, 80, 100];
    return standards.find((s) => s >= minA) ?? 100;
  }

  static inverterMaxStrings(systemKw: number, systemType: string): number {
    if (systemType === "HYBRID") {
      if (systemKw <= 6) return 2;
      return 4;
    }
    return 2;
  }

  static computeElectrical(
    systemKw: number,
    panelW: number,
    systemType: string,
    numPanels: number
  ): ElecResult {
    const iscMap: Record<number, number> = {
      400: 10.1, 420: 10.5, 540: 13.13, 580: 13.4, 620: 13.67,
    };
    const panelIsc = iscMap[panelW] ?? 13.67;

    const maxStrings = EngCalc.inverterMaxStrings(systemKw, systemType);

    const pvWireM = Math.ceil(((numPanels * 2.5 + 20) * 2) / 10) * 10;

    const invAcA = (systemKw * 1000) / (230 * 0.9);

    const dcCbMin = panelIsc * 1.25 * 1.25;
    const dcCbQty = maxStrings;

    const acCbMin = invAcA * 1.25;
    EngCalc.nextAcCbSize(acCbMin);

    const atsQty = systemType === "HYBRID" || systemType === "OFF_GRID" ? 1 : 0;

    return {
      pvWireLengthM: pvWireM,
      thhn55LengthM: 20,
      thhn80LengthM: 75,
      battCableLengthM: 4,
      mc4Sets: maxStrings * 2,
      groundingRods: 1,
      pvGroundingLugs: 2,
      mainDcCbQty: 1,
      dcStringCbQty: dcCbQty,
      acCbQty: 2,
      atsQty,
      distBoxQty: 2,
      conduitQty: 20,
      enclosureQty: 1,
      spdAcQty: 1,
      spdDcQty: 2,
    };
  }

  static inverterKey(systemKw: number, systemType: string): string {
    if (systemType === "GRID_TIE") {
      if (systemKw <= 6) return "Inverter, 6kW, Gridtie, Solis";
      return "Inverter, 8kW, Gridtie, Solis";
    }
    if (systemKw <= 6) return "Inverter, 6kW, Hybrid, Deye";
    if (systemKw <= 8) return "Inverter, 8kW, Hybrid, Deye";
    if (systemKw <= 12) return "Inverter, 12kW, Hybrid, Deye";
    if (systemKw <= 16) return "Inverter, 16kW, Hybrid, Deye";
    return "Inverter, 18kW, Hybrid, Deye";
  }

  static batteryKey(batteryKwh: number): string {
    if (batteryKwh <= 5) return "Battery, 5kWhr, Lithium, 6000 Cycle";
    if (batteryKwh <= 10) return "Battery, 10kWhr, Lithium, 6000 Cycle";
    return "Battery, 15kWhr, Lithium, 6000 Cycle";
  }

  static batteryUnits(batteryKwh: number): number {
    const unitSize = batteryKwh <= 5 ? 5 : batteryKwh <= 10 ? 10 : 15;
    return Math.ceil(batteryKwh / unitSize);
  }

  static computeBOQ(params: {
    systemKw: number;
    panelW: number;
    systemType: string;
    batteryKwh: number;
    numRows: number;
    prices: Record<string, number>;
  }): BOQResult {
    const { systemKw, panelW, systemType, batteryKwh, numRows, prices } = params;

    const numPanels = EngCalc.computeNumPanels(systemKw, panelW);
    const m = EngCalc.computeMounting(numPanels, panelW, numRows);
    const e = EngCalc.computeElectrical(systemKw, panelW, systemType, numPanels);

    const p = (key: string) => prices[key] ?? 0;

    const g1 =
      e.pvWireLengthM * p("Conductor, PV, 4.0mm²") +
      e.thhn55LengthM * p("Conductor, THHN, 5.5mm²") +
      e.thhn80LengthM * p("Conductor, THHN, 8.0mm²") +
      e.battCableLengthM * p("Conductor, Battery, 35mm²") +
      e.mc4Sets * p("Connector, MC4, Set");

    const g2 =
      m.groundingCondPcs * p("Conductor, Grounding") +
      e.groundingRods * p("Grounding Rod, with Clamp") +
      e.pvGroundingLugs * p("Lug, PV Grounding");

    const g3 =
      m.cableTrayPcs * p("Cable Tray, Aluminum") +
      m.railConnectors * p("Connector, PV Railings") +
      m.endClamps * p("PV Clamp, End") +
      m.midClamps * p("PV Clamp, Mid") +
      m.lFootBrackets * p("PV Mounting Bracket, L Foot") +
      m.totalRails * p("PV Roof Railings, 2.4m");

    const g4 =
      e.mainDcCbQty * p("Circuit Breaker, 125AT, DC") +
      e.dcStringCbQty * p("Circuit Breaker, 20AT, DC") +
      e.acCbQty * p("Circuit Breaker, 63AT, AC") +
      e.atsQty * p("Automatic Transfer Switch, 125A") +
      e.distBoxQty * p("Distribution Box, 15 Ways") +
      e.conduitQty * p("Electrical Conduit, HDPE Spiral, 32mm") +
      e.enclosureQty * p("Enclosure, Metal, 300x300x160mm") +
      e.spdAcQty * p("Surge Protection Device (SPD), AC") +
      e.spdDcQty * p("Surge Protection Device (SPD), DC");

    const invKey = EngCalc.inverterKey(systemKw, systemType);
    const battKey = EngCalc.batteryKey(batteryKwh);

    const panelCost = numPanels * p("Solar Panel, 620W, Monocrystalline");
    const inverterCost = p(invKey);
    const batteryCost =
      batteryKwh > 0 ? p(battKey) * EngCalc.batteryUnits(batteryKwh) : 0;
    const otherCost = p(
      "Other Materials and Consumables (Screw, Clamps, Sealant, Terminal Lugs and Others)"
    );

    const materialSubtotal =
      panelCost + inverterCost + batteryCost + g1 + g2 + g3 + g4 + otherCost;
    const mobilization = 5000.0;
    const installation = (materialSubtotal + mobilization) * 0.3;
    const total = materialSubtotal + mobilization + installation;

    return {
      numPanels,
      mounting: m,
      electrical: e,
      panelCost,
      inverterCost,
      batteryCost,
      group1: g1,
      group2: g2,
      group3: g3,
      group4: g4,
      otherCost,
      materialSubtotal,
      mobilization,
      installation,
      total,
      inverterKey: invKey,
      batteryKey: battKey,
    };
  }

  static optimalTilt(latitude: number, mode: string): number {
    const lat = Math.abs(latitude);
    if (mode === "year_round") return parseFloat((0.76 * lat + 3.1).toFixed(1));
    if (mode === "summer") return Math.max(lat - 15.0, 5.0);
    return parseFloat((lat + 15.0).toFixed(1));
  }

  static magDeclination(_lat: number, _lng: number): number {
    return 0.7;
  }

  static compassBearing(magDeclination: number): number {
    return 180.0 - magDeclination;
  }

  static computeEnergy(loads: ApplianceLoad[], psh: number): EnergyResult {
    const totalWh = loads.reduce(
      (s, l) => s + l.wattage * l.qty * l.hoursPerDay,
      0
    );
    const totalKwh = totalWh / 1000;
    const reqKwp = totalKwh / (psh * 0.85 * 0.8);
    const sizes = [3.0, 5.0, 6.0, 8.0, 10.0, 12.0, 15.0, 18.0];
    const recKwp = sizes.find((s) => s >= reqKwp) ?? 20.0;

    const battRec: Record<string, number> = {};
    const bSizes = [5.0, 10.0, 15.0, 20.0, 25.0, 30.0];
    for (const days of [0.5, 1.0, 2.0]) {
      const raw = (totalKwh * days) / 0.8;
      battRec[`${days}day`] = bSizes.find((b) => b >= raw) ?? 30.0;
    }

    return {
      dailyKwh: totalKwh,
      recommendedKwp: recKwp,
      batteryRecs: battRec,
      estimatedGenKwh: recKwp * psh * 0.85,
    };
  }
}
