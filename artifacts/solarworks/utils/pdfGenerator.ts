import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { formatWithCommas } from "./currencyFormatter";
import { BOQResult } from "./engCalc";
import { ApplianceLoad } from "./engCalc";

export interface PDFParams {
  boqNumber: string;
  projectTitle: string;
  location: string;
  systemType: string;
  systemKw: number;
  batteryKwh: number;
  panelW: number;
  boqResult: BOQResult;
  loads?: ApplianceLoad[];
  estimatedGenKwh?: number;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companySocial: string;
}

function php(amount: number): string {
  return formatWithCommas(amount);
}

function systemTypeLabel(t: string): string {
  if (t === "HYBRID") return "Hybrid";
  if (t === "GRID_TIE") return "Grid-Tie";
  return "Off-Grid";
}

export async function generateBOQPDF(params: PDFParams): Promise<string | null> {
  const {
    boqNumber, projectTitle, location, systemType, systemKw, batteryKwh,
    panelW, boqResult: r, loads, estimatedGenKwh,
    companyName, companyAddress, companyPhone, companySocial
  } = params;

  const today = new Date();
  const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
  const typeLabel = systemTypeLabel(systemType);

  const items: Array<{ desc: string; qty: string; unit: string; unitCost: number; amount: number }> = [
    { desc: `Solar Panel, ${panelW}W, Monocrystalline`, qty: String(r.numPanels), unit: "Pcs", unitCost: r.panelCost / r.numPanels, amount: r.panelCost },
    { desc: r.inverterKey, qty: "1", unit: "Unit", unitCost: r.inverterCost, amount: r.inverterCost },
  ];

  if (batteryKwh > 0) {
    const units = Math.ceil(batteryKwh / (batteryKwh <= 5 ? 5 : batteryKwh <= 10 ? 10 : 15));
    items.push({ desc: r.batteryKey, qty: String(units), unit: "Unit", unitCost: r.batteryCost / units, amount: r.batteryCost });
  }

  const e = r.electrical;
  const m = r.mounting;

  const conductorItems = [
    { desc: "Conductor, PV, 4.0mm²", qty: String(e.pvWireLengthM), unit: "meters", unitCost: 100, amount: e.pvWireLengthM * 100 },
    { desc: "Conductor, THHN, 5.5mm²", qty: String(e.thhn55LengthM), unit: "meters", unitCost: 80, amount: e.thhn55LengthM * 80 },
    { desc: "Conductor, THHN, 8.0mm²", qty: String(e.thhn80LengthM), unit: "meters", unitCost: 125, amount: e.thhn80LengthM * 125 },
    { desc: "Conductor, Battery, 35mm²", qty: String(e.battCableLengthM), unit: "meters", unitCost: 450, amount: e.battCableLengthM * 450 },
    { desc: "Connector, MC4, Set", qty: String(e.mc4Sets), unit: "Pcs", unitCost: 90, amount: e.mc4Sets * 90 },
    { desc: "Conductor, Grounding", qty: String(m.groundingCondPcs), unit: "Pcs", unitCost: 145, amount: m.groundingCondPcs * 145 },
    { desc: "Grounding Rod, with Clamp", qty: String(e.groundingRods), unit: "Pc", unitCost: 1500, amount: e.groundingRods * 1500 },
    { desc: "Lug, PV Grounding", qty: String(e.pvGroundingLugs), unit: "Pcs", unitCost: 50, amount: e.pvGroundingLugs * 50 },
    { desc: "Cable Tray, Aluminum", qty: String(m.cableTrayPcs), unit: "Pcs", unitCost: 660, amount: m.cableTrayPcs * 660 },
    { desc: "Connector, PV Railings", qty: String(m.railConnectors), unit: "Pcs", unitCost: 80, amount: m.railConnectors * 80 },
    { desc: "PV Clamp, End", qty: String(m.endClamps), unit: "Pcs", unitCost: 50, amount: m.endClamps * 50 },
    { desc: "PV Clamp, Mid", qty: String(m.midClamps), unit: "Pcs", unitCost: 50, amount: m.midClamps * 50 },
    { desc: "PV Mounting Bracket, L Foot", qty: String(m.lFootBrackets), unit: "Pcs", unitCost: 90, amount: m.lFootBrackets * 90 },
    { desc: "PV Roof Railings, 2.4m", qty: String(m.totalRails), unit: "Pcs", unitCost: 900, amount: m.totalRails * 900 },
    { desc: "Circuit Breaker, 125AT, DC", qty: String(e.mainDcCbQty), unit: "Pc", unitCost: 1800, amount: e.mainDcCbQty * 1800 },
    { desc: "Circuit Breaker, 20AT, DC", qty: String(e.dcStringCbQty), unit: "Pcs", unitCost: 500, amount: e.dcStringCbQty * 500 },
    { desc: "Circuit Breaker, 63AT, AC", qty: String(e.acCbQty), unit: "Pcs", unitCost: 300, amount: e.acCbQty * 300 },
  ];

  if (e.atsQty > 0) {
    conductorItems.push({ desc: "Automatic Transfer Switch, 125A", qty: String(e.atsQty), unit: "Pcs", unitCost: 2600, amount: e.atsQty * 2600 });
  }

  conductorItems.push(
    { desc: "Distribution Box, 15 Ways", qty: String(e.distBoxQty), unit: "Pcs", unitCost: 1000, amount: e.distBoxQty * 1000 },
    { desc: "Electrical Conduit, HDPE Spiral, 32mm", qty: String(e.conduitQty), unit: "Pcs", unitCost: 120, amount: e.conduitQty * 120 },
    { desc: "Enclosure, Metal, 300x300x160mm", qty: String(e.enclosureQty), unit: "Pcs", unitCost: 2600, amount: e.enclosureQty * 2600 },
    { desc: "Surge Protection Device (SPD), AC", qty: String(e.spdAcQty), unit: "Pcs", unitCost: 1350, amount: e.spdAcQty * 1350 },
    { desc: "Surge Protection Device (SPD), DC", qty: String(e.spdDcQty), unit: "Pcs", unitCost: 1350, amount: e.spdDcQty * 1350 },
    { desc: "Other Materials and Consumables", qty: "1", unit: "Lot", unitCost: 2200, amount: 2200 }
  );

  const allItems = [...items, ...conductorItems];

  let itemRows = "";
  allItems.forEach((item, idx) => {
    const bg = idx % 2 === 0 ? "#FFFFFF" : "#F5F5F7";
    itemRows += `
      <tr style="background:${bg}">
        <td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:center">${idx + 1}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #eee">${item.desc}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:center">${item.qty}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:center">${item.unit}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace">${php(item.unitCost)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace">${php(item.amount)}</td>
      </tr>`;
  });

  let loadSummaryHtml = "";
  if (loads && loads.length > 0) {
    const totalWh = loads.reduce((s, l) => s + l.wattage * l.qty * l.hoursPerDay, 0);
    const totalKwh = totalWh / 1000;
    const loadRows = loads.map(l => `<li>${l.name} × ${l.qty} @ ${l.hoursPerDay}h/day = ${php(l.wattage * l.qty * l.hoursPerDay)} Wh</li>`).join("");
    loadSummaryHtml = `
      <div style="margin-top:20px">
        <div style="color:#E87C27;font-weight:700;font-size:11pt;margin-bottom:8px">LOAD SUMMARY</div>
        <ul style="margin:0;padding-left:18px;font-size:9pt">${loadRows}</ul>
        <div style="font-weight:700;margin-top:8px;font-size:10pt">Total Daily Consumption: ${totalKwh.toFixed(1)} kWh</div>
      </div>`;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 20px; font-size: 9pt; color: #1C1C1E; }
  * { box-sizing: border-box; }
</style>
</head>
<body>
  <!-- HEADER -->
  <table width="100%" style="background:#E87C27;padding:12px 16px;border-radius:4px 4px 0 0">
    <tr>
      <td style="width:60px;text-align:center">
        <svg width="50" height="50" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <polygon points="50,5 61,35 95,35 67,57 79,91 50,70 21,91 33,57 5,35 39,35" fill="white"/>
        </svg>
      </td>
      <td style="text-align:center">
        <div style="color:white;font-weight:700;font-size:18pt">${companyName || "SolarWorks Zambales"}</div>
        <div style="color:white;font-size:9pt">${companyAddress || "Brgy. Sto. Rosario, Iba, Zambales"} | ${companyPhone || "+63 912 458 2437"} | ${companySocial || "facebook.com/SolarWorksZambales"}</div>
      </td>
    </tr>
  </table>
  <div style="background:#E87C27;text-align:center;padding:8px;margin-top:2px">
    <span style="color:white;font-weight:600;font-size:11pt">PHOTO VOLTAIC SYSTEM BILL OF QUANTITIES</span>
  </div>

  <!-- INFO -->
  <div style="margin:12px 0 8px">
    <div style="color:#E87C27;font-weight:700;font-size:9pt">BOQ #: ${boqNumber}</div>
    <div style="font-size:9pt">Date: ${dateStr}</div>
  </div>

  <!-- SPECS -->
  <div style="margin-bottom:12px">
    <div style="color:#E87C27;font-weight:700;font-size:10pt;margin-bottom:6px">SYSTEM SPECIFICATIONS</div>
    <div style="font-size:9pt;margin-bottom:4px">
      <strong>Project Title:</strong> Supply, Delivery, Installation, Configuration, Testing and Commissioning of
      <span style="color:#007AFF">${systemKw}kWP ${typeLabel} PV System for ${location || "TBD"}</span>
    </div>
    <div style="font-size:9pt;margin-bottom:4px"><strong>Location:</strong> ${location || "—"}</div>
    <table width="100%" style="font-size:9pt;margin-top:4px">
      <tr>
        <td width="50%"><strong>System Type:</strong> ${typeLabel}</td>
        <td width="50%"><strong>System Size:</strong> ${systemKw} kWp</td>
      </tr>
      <tr>
        <td><strong>Backup Battery:</strong> ${batteryKwh > 0 ? `${batteryKwh} kWh` : "None"}</td>
        <td><strong>Est. Daily Generation:</strong> ${estimatedGenKwh ? `${estimatedGenKwh.toFixed(1)} kWh` : "—"}</td>
      </tr>
    </table>
  </div>

  <!-- ITEM TABLE -->
  <table width="100%" style="border-collapse:collapse;font-size:9pt">
    <thead>
      <tr style="background:#1C1C1E;color:white">
        <th style="padding:6px 8px;width:30px">#</th>
        <th style="padding:6px 8px;text-align:left">DESCRIPTION</th>
        <th style="padding:6px 8px;width:60px">QTY</th>
        <th style="padding:6px 8px;width:60px">UNIT</th>
        <th style="padding:6px 8px;width:90px;text-align:right">UNIT COST</th>
        <th style="padding:6px 8px;width:100px;text-align:right">AMOUNT (PHP)</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr>
        <td colspan="4" style="padding:8px;background:#E87C27;color:white;font-weight:700;text-align:center">Mobilization</td>
        <td></td>
        <td style="padding:8px;background:#E87C27;color:white;font-weight:700;text-align:right;font-family:monospace">${php(r.mobilization)}</td>
      </tr>
      <tr>
        <td colspan="4" style="padding:8px;background:#E87C27;color:white;font-weight:700;text-align:center">Installation (30%)</td>
        <td></td>
        <td style="padding:8px;background:#E87C27;color:white;font-weight:700;text-align:right;font-family:monospace">${php(r.installation)}</td>
      </tr>
      <tr>
        <td colspan="5" style="padding:10px 8px;background:#E87C27;color:white;font-weight:700;font-size:10pt">TOTAL PROJECT COST (PHP)</td>
        <td style="padding:10px 8px;background:#E87C27;color:white;font-weight:700;text-align:right;font-family:monospace;font-size:10pt">${php(r.total)}</td>
      </tr>
    </tbody>
  </table>
  <div style="font-style:italic;font-size:8pt;margin:4px 0 16px;color:#666">VAT EXCLUSIVE</div>

  ${loadSummaryHtml}

  <!-- WARRANTY & NOTES -->
  <table width="100%" style="margin-top:20px;border-top:2px solid #E87C27">
    <tr>
      <td width="50%" style="padding:12px 12px 12px 0;vertical-align:top;border-right:1px solid #E5E5EA">
        <div style="color:#E87C27;font-weight:700;font-size:10pt;margin-bottom:6px">WARRANTY</div>
        <ul style="margin:0;padding-left:18px;font-size:8pt">
          <li>Solar Panels: 12 years product, 25 years performance</li>
          <li>Inverter: 5 years manufacturer warranty</li>
          <li>Battery: 10 years or 6,000 cycles</li>
          <li>Installation: 1 year workmanship warranty</li>
          <li>Mounting: 10 years structural warranty</li>
        </ul>
      </td>
      <td width="50%" style="padding:12px 0 12px 12px;vertical-align:top">
        <div style="color:#E87C27;font-weight:700;font-size:10pt;margin-bottom:6px">NOTES</div>
        <ul style="margin:0;padding-left:18px;font-size:8pt">
          <li>Price valid for 30 days from date of quotation</li>
          <li>50% downpayment required upon signing</li>
          <li>Installation timeline: 3–5 working days</li>
          <li>Permit and grid connection fees not included</li>
          <li>Subject to site inspection before finalization</li>
        </ul>
      </td>
    </tr>
  </table>

  <!-- FOOTER -->
  <div style="margin-top:20px;padding-top:8px;border-top:1px solid #E5E5EA;text-align:center;color:#8E8E93;font-size:7pt">
    This is a system-generated document from SolarWorks Zambales App
  </div>
</body>
</html>`;

  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const destUri = `${FileSystem.documentDirectory}BOQ_${boqNumber}.pdf`;
    await FileSystem.copyAsync({ from: uri, to: destUri });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(destUri, { mimeType: "application/pdf" });
    }
    return destUri;
  } catch (e) {
    console.error("PDF generation error:", e);
    return null;
  }
}
