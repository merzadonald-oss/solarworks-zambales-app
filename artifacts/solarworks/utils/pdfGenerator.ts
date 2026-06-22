import { Platform } from "react-native";
import { BOQResult } from "./engCalc";
import { ApplianceLoad } from "./engCalc";
import { EngCalc } from "./engCalc";
import LOGO_DATA_URI from "./logoBase64";

export interface PDFParams {
  boqNumber: string;
  projectTitle: string;
  ownerName: string;
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

function fmt(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function typeLabel(t: string): string {
  if (t === "HYBRID") return "Hybrid";
  if (t === "GRID_TIE") return "Grid-Tie";
  return "Off-Grid";
}

export async function generateBOQPDF(params: PDFParams): Promise<string | null> {
  const {
    boqNumber, ownerName, location, systemType, systemKw, batteryKwh,
    panelW, boqResult: r, loads,
    companyName, companyAddress, companyPhone, companySocial,
  } = params;

  const today = new Date();
  const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
  const sysLabel = typeLabel(systemType);
  const estGen = Math.round(systemKw * 5.5 * 0.85);

  // Build the full project title with system details (matches screenshot style)
  const fullTitle = `Supply, Delivery, Installation, Configuration, Testing and Commissioning of ${systemKw}kWP ${sysLabel} PV System for ${ownerName || "Client"}`;

  // Panel unit cost
  const panelUnitCost = r.numPanels > 0 ? r.panelCost / r.numPanels : 0;

  // Battery display
  const battUnits = batteryKwh > 0 ? EngCalc.batteryUnits(batteryKwh) : 0;
  const battUnitCost = battUnits > 0 ? r.batteryCost / battUnits : 0;

  // ── 10 line items ───────────────────────────────────────────────────────
  interface LineItem {
    desc: string;
    qty: string;
    unit: string;
    unitCost: number | null;
    amount: number;
  }

  const items: LineItem[] = [
    {
      desc: `Solar Panel, ${panelW} W, Monocrystalline`,
      qty: String(r.numPanels),
      unit: "Pcs",
      unitCost: panelUnitCost,
      amount: r.panelCost,
    },
    {
      desc: r.inverterKey,
      qty: "1",
      unit: "Unit",
      unitCost: r.inverterCost,
      amount: r.inverterCost,
    },
  ];

  if (batteryKwh > 0) {
    items.push({
      desc: r.batteryKey,
      qty: String(battUnits),
      unit: "Unit",
      unitCost: battUnitCost,
      amount: r.batteryCost,
    });
  }

  items.push(
    {
      desc: "Conductors and Connectors (PV Wire, AC Wire, MC4)",
      qty: "1",
      unit: "Lot",
      unitCost: r.group1,
      amount: r.group1,
    },
    {
      desc: "Grounding System (Grounding Wire, Grounding Rod and Clamps)",
      qty: "1",
      unit: "Lot",
      unitCost: r.group2,
      amount: r.group2,
    },
    {
      desc: "Roof Top Railing Materials and Accessories",
      qty: "1",
      unit: "Lot",
      unitCost: r.group3,
      amount: r.group3,
    },
    {
      desc: "Surge Protection, Overcurrent Protection, Switching System and Electrical Enclosure",
      qty: "1",
      unit: "Lot",
      unitCost: r.group4,
      amount: r.group4,
    },
    {
      desc: "Other Materials and Consumables (Screw, Clamps, Sealant, Terminal Lugs and Others)",
      qty: "1",
      unit: "Lot",
      unitCost: r.otherCost,
      amount: r.otherCost,
    },
    {
      desc: "Mobilization",
      qty: "1",
      unit: "Lot",
      unitCost: r.mobilization,
      amount: r.mobilization,
    },
    {
      desc: "Installation, Configuration, Testing and Commissioning",
      qty: "",
      unit: "",
      unitCost: null,
      amount: r.installation,
    }
  );

  let itemRows = "";
  items.forEach((item, idx) => {
    const bg = idx % 2 === 0 ? "#FFFFFF" : "#F8F9FA";
    itemRows += `
      <tr style="background:${bg};">
        <td style="padding:5px 8px;border-bottom:1px solid #E9ECEF;text-align:center;font-size:8.5pt;">${idx + 1}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #E9ECEF;font-size:8.5pt;">${item.desc}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #E9ECEF;text-align:center;font-size:8.5pt;">${item.qty}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #E9ECEF;text-align:center;font-size:8.5pt;">${item.unit}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #E9ECEF;text-align:right;font-size:8.5pt;">${item.unitCost !== null ? fmt(item.unitCost) : ""}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #E9ECEF;text-align:right;font-size:8.5pt;font-weight:600;">${fmt(item.amount)}</td>
      </tr>`;
  });

  // ── Load Summary ──────────────────────────────────────────────────────────
  let loadSummaryHtml = "";
  if (loads && loads.length > 0) {
    const totalWh = loads.reduce((s, l) => s + l.wattage * l.qty * l.hoursPerDay, 0);
    const totalKwh = (totalWh / 1000).toFixed(1);

    const loadRows = loads
      .map((l) => {
        const wh = l.wattage * l.qty * l.hoursPerDay;
        return `<li style="margin-bottom:3px;">${l.name} &times; ${l.qty} @ ${l.hoursPerDay}h/day = ${fmt(wh)} Wh</li>`;
      })
      .join("");

    loadSummaryHtml = `
      <div style="margin-top:18px;">
        <div style="color:#E87C27;font-weight:700;font-size:9pt;margin-bottom:8px;">LOAD SUMMARY</div>
        <ul style="margin:0 0 6px 0;padding-left:20px;font-size:8.5pt;line-height:1.7;">
          ${loadRows}
          <li style="margin-top:4px;list-style:none;margin-left:-20px;font-weight:700;font-size:9pt;">
            Total Daily Consumption: ${totalKwh} kWh
          </li>
        </ul>
      </div>`;
  }

  // ── HTML ──────────────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 9pt; color: #1A1F36; padding: 18px; }
  table { border-collapse: collapse; }
  td, th { vertical-align: middle; }
  @media print {
    body { padding: 10px; }
    @page { margin: 12mm; size: A4 portrait; }
  }
</style>
</head>
<body>

<!-- ═══ HEADER ═══ -->
<table width="100%" style="background:#E87C27;border-radius:4px 4px 0 0;">
  <tr>
    <td width="80" style="padding:6px 8px 6px 10px;text-align:center;vertical-align:middle;">
      <img src="${LOGO_DATA_URI}" width="68" height="68" style="display:block;object-fit:contain;" />
    </td>
    <td style="text-align:center;padding:10px 14px 10px 0;vertical-align:middle;">
      <div style="color:white;font-weight:800;font-size:18pt;letter-spacing:0.3px;">${companyName || "SolarWorks Zambales"}</div>
      <div style="color:rgba(255,255,255,0.92);font-size:8.5pt;margin-top:3px;">
        ${companyAddress || "Brgy. Sto. Rosario, Iba, Zambales"} &nbsp;|&nbsp;
        ${companyPhone || "+63 912 458 2437"} &nbsp;|&nbsp;
        ${companySocial || "facebook.com/SolarWorksZambales"}
      </div>
    </td>
  </tr>
</table>
<div style="background:#D4710E;text-align:center;padding:6px 0;border-radius:0 0 4px 4px;margin-bottom:12px;">
  <span style="color:white;font-weight:700;font-size:9.5pt;letter-spacing:0.5px;">PHOTO VOLTAIC SYSTEM BILL OF QUANTITIES</span>
</div>

<!-- ═══ BOQ INFO ═══ -->
<div style="margin-bottom:12px;font-size:9pt;">
  <div style="margin-bottom:2px;"><strong>BOQ #:</strong> ${boqNumber}</div>
  <div><strong>Date:</strong> ${dateStr}</div>
</div>

<!-- ═══ SYSTEM SPECIFICATIONS ═══ -->
<div style="color:#E87C27;font-weight:700;font-size:9.5pt;margin-bottom:6px;">SYSTEM SPECIFICATIONS</div>
<div style="font-size:8.5pt;margin-bottom:3px;">
  <strong>Project Title:</strong> ${fullTitle}
</div>
<div style="font-size:8.5pt;margin-bottom:6px;"><strong>Location:</strong> ${location || ""}</div>
<table width="100%" style="font-size:8.5pt;margin-bottom:14px;">
  <tr>
    <td width="50%"><strong>System Type:</strong>&nbsp; ${sysLabel}</td>
    <td width="50%"><strong>System Size:</strong>&nbsp; ${systemKw}kWp</td>
  </tr>
  <tr>
    <td><strong>Backup Battery Capacity:</strong>&nbsp; ${batteryKwh > 0 ? `${batteryKwh} kWh` : "None"}</td>
    <td><strong>Estimated Daily Generation:</strong>&nbsp; ${estGen}kWh</td>
  </tr>
</table>

<!-- ═══ BOQ TABLE ═══ -->
<table width="100%" style="border-collapse:collapse;font-size:8.5pt;">
  <thead>
    <tr style="background:#1A1F36;color:white;">
      <th style="padding:7px 8px;width:26px;text-align:center;">#</th>
      <th style="padding:7px 8px;text-align:left;">DESCRIPTION</th>
      <th style="padding:7px 8px;width:72px;text-align:center;">QUANTITY</th>
      <th style="padding:7px 8px;width:48px;text-align:center;">UNIT</th>
      <th style="padding:7px 8px;width:92px;text-align:right;">UNIT COST</th>
      <th style="padding:7px 8px;width:100px;text-align:right;">AMOUNT (PHP)</th>
    </tr>
  </thead>
  <tbody>
    ${itemRows}
  </tbody>
</table>
<!-- Total rows -->
<table width="100%" style="border-collapse:collapse;font-size:9pt;">
  <tr style="background:#E87C27;">
    <td style="padding:8px 10px;color:white;font-weight:700;font-size:9.5pt;">TOTAL PROJECT COST (PHP)</td>
    <td style="padding:8px 10px;color:white;font-weight:700;font-size:9.5pt;text-align:right;white-space:nowrap;">${fmt(r.total)}</td>
  </tr>
  <tr style="background:#E87C27;">
    <td colspan="2" style="padding:3px 10px 6px;color:rgba(255,255,255,0.9);font-size:7.5pt;font-style:italic;">VAT EXCLUSIVE</td>
  </tr>
</table>

${loadSummaryHtml}

<!-- ═══ WARRANTY / NOTES ═══ -->
<table width="100%" style="margin-top:20px;border-top:2px solid #E87C27;font-size:8.5pt;">
  <tr>
    <td width="52%" style="padding:12px 12px 12px 0;vertical-align:top;border-right:1px solid #DEE2E6;">
      <div style="color:#E87C27;font-weight:700;font-size:9pt;margin-bottom:7px;">WARRANTY</div>
      <ul style="padding-left:16px;line-height:1.8;margin:0;">
        <li>3 Years for Workmanship</li>
        <li>12 Years Product Warranty for Solar Panels</li>
        <li>5 Years Manufacturer Warranty for Inverter</li>
        <li>5 Years Manufacturer Warranty for Battery</li>
      </ul>
      <p style="margin-top:6px;line-height:1.6;">Warranty covers replacement / repair for damage items resulting from factory defects only.</p>
      <p style="margin-top:4px;line-height:1.6;">This warranty does not cover misuse, acts of Gods, and other factors beyond our control.</p>
    </td>
    <td width="48%" style="padding:12px 0 12px 14px;vertical-align:top;">
      <div style="color:#E87C27;font-weight:700;font-size:9pt;margin-bottom:7px;">NOTES</div>
      <ul style="padding-left:16px;line-height:1.8;margin:0;list-style:none;">
        <li style="margin-bottom:2px;">For roof mounted solar panel only</li>
        <li style="margin-bottom:2px;">Prices may change without prior notice</li>
        <li style="line-height:1.6;">This BOQ is for estimate only, please contact ${companyName || "SolarWorks Zambales"} for the final BOQ.</li>
      </ul>
    </td>
  </tr>
</table>

</body>
</html>`;

  // ── Web: open in new tab and trigger browser print-to-PDF ─────────────────
  if (Platform.OS === "web") {
    try {
      const newWin = window.open("", "_blank");
      if (!newWin) {
        // Popup blocked — fallback: create a blob URL and navigate
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        return url;
      }
      newWin.document.open();
      newWin.document.write(html);
      newWin.document.close();
      // Wait for fonts / layout then open print dialog
      newWin.addEventListener("load", () => {
        setTimeout(() => newWin.print(), 300);
      });
      // Safety fallback if load event already fired
      setTimeout(() => {
        try { newWin.print(); } catch {}
      }, 900);
      return boqNumber;
    } catch (e) {
      console.error("PDF web error:", e);
      return null;
    }
  }

  // ── Native: expo-print → save to filesystem → share ───────────────────────
  try {
    const Print = await import("expo-print");
    const Sharing = await import("expo-sharing");
    const FileSystem = await import("expo-file-system");

    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const destUri = `${FileSystem.documentDirectory}BOQ_${boqNumber}.pdf`;
    await FileSystem.copyAsync({ from: uri, to: destUri });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(destUri, { mimeType: "application/pdf" });
    }
    return destUri;
  } catch (e) {
    console.error("PDF native error:", e);
    return null;
  }
}
