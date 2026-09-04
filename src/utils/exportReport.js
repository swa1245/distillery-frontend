const enc = new TextEncoder();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(n) {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n, true);
  return b;
}

function u32(n) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
}

function concat(parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function zipStore(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const file of files) {
    const name = enc.encode(file.name);
    const data = typeof file.data === "string" ? enc.encode(file.data) : file.data;
    const crc = crc32(data);
    const local = concat([
      enc.encode("PK\x03\x04"),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      data,
    ]);
    const central = concat([
      enc.encode("PK\x01\x02"),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }

  const centralDir = concat(centrals);
  const end = concat([
    enc.encode("PK\x05\x06"),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);
  return concat([...locals, centralDir, end]);
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function colLetter(index) {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function isNumeric(value) {
  const raw = String(value ?? "").trim();
  if (!raw || Number.isNaN(Number(raw))) return false;
  return /^-?\d+(\.\d+)?$/.test(raw);
}

function cellXml(ref, value, style) {
  if (isNumeric(value)) {
    return `<c r="${ref}" s="${style}" t="n"><v>${Number(value)}</v></c>`;
  }
  const text = xmlEscape(value);
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
}

function contentTypes() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
}

function rels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function workbookRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function safeSheetName(name) {
  return xmlEscape(String(name || "Report").replace(/[\\/*?:\[\]]/g, " ").slice(0, 31));
}

function workbookXml(sheetName = "Report") {
  const name = safeSheetName(sheetName);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <workbookPr/>
  <bookViews>
    <workbookView xWindow="120" yWindow="80" windowWidth="26000" windowHeight="16000"/>
  </bookViews>
  <sheets>
    <sheet name="${name}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="8">
    <font><sz val="11"/><color rgb="FF1A1A1A"/><name val="Calibri"/></font>
    <font><b/><sz val="20"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="14"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><sz val="10"/><color rgb="FF355E42"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FF166534"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FF9F1239"/><name val="Calibri"/></font>
  </fonts>
  <fills count="10">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF2F6B3A"/><bgColor rgb="FF2F6B3A"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E3A28"/><bgColor rgb="FF1E3A28"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEEF5EF"/><bgColor rgb="FFEEF5EF"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF7FBF8"/><bgColor rgb="FFF7FBF8"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF3D7A4A"/><bgColor rgb="FF3D7A4A"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/><bgColor rgb="FFDCFCE7"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/><bgColor rgb="FFFEE2E2"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor rgb="FFFFFFFF"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFC5D5C8"/></left>
      <right style="thin"><color rgb="FFC5D5C8"/></right>
      <top style="thin"><color rgb="FFC5D5C8"/></top>
      <bottom style="thin"><color rgb="FFC5D5C8"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FF1E3A28"/></left>
      <right style="thin"><color rgb="FF1E3A28"/></right>
      <top style="thin"><color rgb="FF1E3A28"/></top>
      <bottom style="medium"><color rgb="FF1E3A28"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="16">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="4" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="9" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="center" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="center" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="5" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center" indent="1"/>
    </xf>
    <xf numFmtId="0" fontId="6" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="7" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="3" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="9" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="9" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center"/>
    </xf>
  </cellXfs>
</styleSheet>`;
}

function flattenExportRows(rows = [], groups) {
  if (!Array.isArray(groups) || !groups.length) {
    return (rows || []).map((values) => ({ kind: "data", values }));
  }
  const out = [];
  for (const group of groups) {
    out.push({ kind: "section", values: [group.title || ""] });
    const list = group.rows || [];
    if (!list.length) {
      out.push({ kind: "empty", values: ["No rows in this section."] });
    } else {
      for (const values of list) out.push({ kind: "data", values });
    }
  }
  return out;
}

function colWidths(headers, lines) {
  return headers.map((h, i) => {
    let max = String(h || "").length;
    const key = String(h || "").toLowerCase();
    if (key.includes("sl") || key === "status" || key === "unit") max = Math.max(max, 10);
    for (const line of lines) {
      if (line.kind === "section") continue;
      max = Math.max(max, String(line.values?.[i] ?? "").length);
    }
    if (i === 0) return Math.min(14, Math.max(10, max + 2));
    if (key.includes("particular") || key.includes("section") || key.includes("remark")) {
      return Math.min(42, Math.max(18, max + 4));
    }
    return Math.min(28, Math.max(12, max + 3));
  });
}

function dataStyle(value, header, zebra) {
  const label = String(header || "");
  const raw = String(value ?? "").trim();
  if (label === "Status" || raw === "In range" || raw === "Out of range") {
    if (raw === "In range") return 8;
    if (raw === "Out of range") return 9;
    return 10;
  }
  if (label === "Sl. No." || label === "Unit") return zebra ? 14 : 13;
  if (isNumeric(value)) return zebra ? 12 : 11;
  return zebra ? 6 : 5;
}

function sheetXml({ companyName, title, subtitle, headers, rows, groups, exportedAt }) {
  const colCount = Math.max(headers.length, 1);
  const lastCol = colLetter(colCount - 1);
  const lines = flattenExportRows(rows, groups);
  const widths = colWidths(headers, lines);
  const cols = widths
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1" bestFit="1"/>`)
    .join("");

  const banner = (r, style, value, height) =>
    `<row r="${r}" ht="${height}" customHeight="1">${cellXml(`A${r}`, value, style)}</row>`;

  const headerCells = headers.map((h, i) => cellXml(`${colLetter(i)}4`, h, 4)).join("");

  const merges = [
    `<mergeCell ref="A1:${lastCol}1"/>`,
    `<mergeCell ref="A2:${lastCol}2"/>`,
    `<mergeCell ref="A3:${lastCol}3"/>`,
  ];

  let dataXml = "";
  let zebra = 0;
  if (!lines.length) {
    dataXml = `<row r="5" ht="22" customHeight="1">${cellXml("A5", "No entries.", 15)}</row>`;
    merges.push(`<mergeCell ref="A5:${lastCol}5"/>`);
  } else {
    dataXml = lines
      .map((line, i) => {
        const r = 5 + i;
        if (line.kind === "section") {
          merges.push(`<mergeCell ref="A${r}:${lastCol}${r}"/>`);
          return `<row r="${r}" ht="24" customHeight="1">${cellXml(`A${r}`, line.values[0], 7)}</row>`;
        }
        if (line.kind === "empty") {
          merges.push(`<mergeCell ref="A${r}:${lastCol}${r}"/>`);
          return `<row r="${r}" ht="20" customHeight="1">${cellXml(`A${r}`, line.values[0], 15)}</row>`;
        }
        const odd = zebra % 2 === 1;
        zebra += 1;
        const cells = headers
          .map((h, ci) => cellXml(`${colLetter(ci)}${r}`, line.values[ci], dataStyle(line.values[ci], h, odd)))
          .join("");
        return `<row r="${r}" ht="20" customHeight="1">${cells}</row>`;
      })
      .join("");
  }

  const lastDataRow = 4 + Math.max(lines.length, 1);
  const footerRow = lastDataRow + 1;
  const footer = `${exportedAt || ""}    ${lines.filter((l) => l.kind === "data").length} ${
    lines.filter((l) => l.kind === "data").length === 1 ? "entry" : "entries"
  }`;
  merges.push(`<mergeCell ref="A${footerRow}:${lastCol}${footerRow}"/>`);

  const lastColLetter = lastCol;
  const filterXml =
    Array.isArray(groups) && groups.length
      ? ""
      : `<autoFilter ref="A4:${lastColLetter}${lastDataRow}"/>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetPr>
    <tabColor rgb="FF2F6B3A"/>
    <pageSetUpPr fitToPage="1"/>
  </sheetPr>
  <dimension ref="A1:${lastCol}${footerRow}"/>
  <sheetViews>
    <sheetView workbookViewId="0" showGridLines="0" zoomScale="110" zoomScaleNormal="100">
      <pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="18" defaultColWidth="14"/>
  <cols>${cols}</cols>
  <sheetData>
    ${banner(1, 1, companyName || "Digital Distillery", 36)}
    ${banner(2, 2, title || "Report", 26)}
    ${banner(3, 3, subtitle || "", 20)}
    <row r="4" ht="32" customHeight="1">${headerCells}</row>
    ${dataXml}
    <row r="${footerRow}" ht="22" customHeight="1">${cellXml(`A${footerRow}`, footer, 15)}</row>
  </sheetData>
  <mergeCells count="${merges.length}">${merges.join("")}</mergeCells>
  ${filterXml}
  <printOptions horizontalCentered="1"/>
  <pageMargins left="0.45" right="0.45" top="0.7" bottom="0.6" header="0.28" footer="0.28"/>
  <pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0" paperSize="9" scale="100"/>
  <headerFooter>
    <oddHeader>&amp;L&amp;"Calibri,Bold"&amp;10 ${xmlEscape(companyName || "")}&amp;C&amp;"Calibri,Bold"&amp;12 ${xmlEscape(
      title || "Report"
    )}&amp;R&amp;D</oddHeader>
    <oddFooter>&amp;L&amp;"Calibri"&amp;9 ${xmlEscape(subtitle || "")}&amp;C&amp;"Calibri"&amp;9 Page &amp;P of &amp;N&amp;R&amp;"Calibri"&amp;9 ${xmlEscape(
      exportedAt || ""
    )}</oddFooter>
  </headerFooter>
</worksheet>`;
}

export function downloadExcelTable({ fileName, title, companyName, headers, rows, sheetName, subtitle, groups }) {
  const exportedAt = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const line =
    subtitle ||
    `Exported ${exportedAt}  ·  ${(rows || []).length} ${(rows || []).length === 1 ? "entry" : "entries"}`;

  const bytes = zipStore([
    { name: "[Content_Types].xml", data: contentTypes() },
    { name: "_rels/.rels", data: rels() },
    { name: "xl/workbook.xml", data: workbookXml(sheetName || title || "Report") },
    { name: "xl/_rels/workbook.xml.rels", data: workbookRels() },
    { name: "xl/styles.xml", data: stylesXml() },
    {
      name: "xl/worksheets/sheet1.xml",
      data: sheetXml({
        companyName,
        title,
        subtitle: line,
        headers,
        rows: rows || [],
        groups,
        exportedAt,
      }),
    },
  ]);

  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".xlsx") ? fileName : `${fileName.replace(/\.xls$/i, "")}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function triggerBlobDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function lineChartSvg({ labels = [], series = [], width = 640, height = 200 }) {
  const pad = { l: 36, r: 14, t: 16, b: 28 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const all = series.flatMap((s) => s.data || []);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const toXY = (data) =>
    data.map((v, i) => {
      const x = pad.l + (i / Math.max(data.length - 1, 1)) * innerW;
      const y = pad.t + innerH - ((v - min) / span) * innerH;
      return [x, y];
    });
  const grid = [0, 0.5, 1]
    .map((t) => {
      const y = pad.t + innerH * (1 - t);
      const val = min + span * t;
      return `<line x1="${pad.l}" x2="${width - pad.r}" y1="${y}" y2="${y}" stroke="#e8eef5" stroke-width="1"/>
        <text x="${pad.l - 6}" y="${y + 3}" text-anchor="end" fill="#94a3b8" font-size="9" font-weight="700">${val.toFixed(2)}</text>`;
    })
    .join("");
  const lines = series
    .map((s) => {
      const pts = toXY(s.data || []);
      const poly = pts.map((p) => p.join(",")).join(" ");
      const dots = pts
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#fff" stroke="${s.color}" stroke-width="2"/>`)
        .join("");
      return `<polyline points="${poly}" fill="none" stroke="${s.color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>${dots}`;
    })
    .join("");
  const xLabels = labels
    .map((lab, i) => {
      const x = pad.l + (i / Math.max(labels.length - 1, 1)) * innerW;
      return `<text x="${x}" y="${height - 8}" text-anchor="middle" fill="#94a3b8" font-size="9" font-weight="700">${xmlEscape(lab)}</text>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" xmlns="http://www.w3.org/2000/svg">${grid}${lines}${xLabels}</svg>`;
}

function columnTankSvg() {
  return `<svg viewBox="0 0 56 88" width="44" height="70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="18" y="2" width="20" height="8" rx="2" fill="#64748b"/>
    <rect x="12" y="10" width="32" height="72" rx="10" fill="#eef4fb" stroke="#94a3b8" stroke-width="1.6"/>
    <rect x="15" y="38" width="26" height="41" rx="8" fill="#3b82f6" opacity="0.88"/>
    <rect x="22" y="82" width="12" height="5" rx="1.5" fill="#64748b"/>
  </svg>`;
}

/**
 * Downloads a print-ready HTML dashboard report (open in browser → Print / Save as PDF).
 * Typography matches the Distiller app (Plus Jakarta Sans).
 * @param {{
 *  fileName?: string,
 *  companyName?: string,
 *  title: string,
 *  subtitle?: string,
 *  meta?: Array<{label: string, value: string}>,
 *  kpis?: Array<{title: string, value: string, unit?: string, sub?: string}>,
 *  sections?: Array<{
 *    title: string,
 *    kind?: "table" | "status" | "cards" | "alerts" | "columns" | "chart" | "html",
 *    headers?: string[],
 *    rows?: any[][],
 *    items?: any[],
 *    cards?: Array<{label: string, value: string, sub?: string, badge?: string}>,
 *    labels?: string[],
 *    series?: Array<{label: string, color: string, data: number[]}>,
 *    html?: string,
 *    highlightLast?: boolean,
 *  }>,
 *  footerNote?: string,
 * }} opts
 */
export function downloadDashboardHtmlReport(opts = {}) {
  const exportedAt = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const company = xmlEscape(opts.companyName || "Digital Distillery");
  const title = xmlEscape(opts.title || "Dashboard Report");
  const subtitle = xmlEscape(opts.subtitle || `Exported ${exportedAt}`);
  const meta = (opts.meta || [])
    .map(
      (m) =>
        `<div class="meta-pill"><span>${xmlEscape(m.label)}</span><strong>${xmlEscape(m.value)}</strong></div>`
    )
    .join("");

  const kpis = (opts.kpis || [])
    .map(
      (k) => `<article class="kpi">
      <p class="kpi-label">${xmlEscape(k.title)}</p>
      <p class="kpi-value">${xmlEscape(k.value)}${k.unit ? `<span>${xmlEscape(k.unit)}</span>` : ""}</p>
      ${k.sub ? `<p class="kpi-sub">${xmlEscape(k.sub)}</p>` : ""}
    </article>`
    )
    .join("");

  const sections = (opts.sections || [])
    .map((sec) => {
      const head = `<div class="sec-head"><h2>${xmlEscape(sec.title)}</h2></div>`;
      if (sec.kind === "chart") {
        const legend = (sec.series || [])
          .map(
            (s) =>
              `<span class="legend"><i style="background:${s.color}"></i>${xmlEscape(s.label)}</span>`
          )
          .join("");
        return `<section class="card">${head}<div class="legend-row">${legend}</div>${lineChartSvg({
          labels: sec.labels || [],
          series: sec.series || [],
        })}</section>`;
      }
      if (sec.kind === "cards") {
        const cards = (sec.cards || [])
          .map(
            (c) => `<div class="sum-card">
            <p class="kpi-label">${xmlEscape(c.label)}</p>
            <p class="sum-value">${xmlEscape(c.value)}</p>
            ${c.sub ? `<p class="kpi-sub">${xmlEscape(c.sub)}</p>` : ""}
            ${c.badge ? `<span class="badge">${xmlEscape(c.badge)}</span>` : ""}
          </div>`
          )
          .join("");
        return `<section class="card">${head}<div class="sum-grid">${cards}</div></section>`;
      }
      if (sec.kind === "alerts") {
        const list = (sec.items || [])
          .map(
            (a) => `<li class="alert ${a.level === "high" ? "high" : "warn"}">
            <strong>${xmlEscape(a.title)}</strong>
            <span>${xmlEscape(a.detail || "")}</span>
            <em>${xmlEscape(a.time || "")}</em>
          </li>`
          )
          .join("");
        return `<section class="card">${head}<ul class="alerts">${list}</ul></section>`;
      }
      if (sec.kind === "columns" || sec.kind === "status") {
        const items = sec.items || [];
        const tanks = items
          .map(
            (c, i) => `<div class="col-item">
            <span class="run-pill">Running</span>
            <div class="tank-wrap">${columnTankSvg()}</div>
            <strong>${xmlEscape(c.name)}</strong>
            <small>${
              c.hideTemp
                ? "—"
                : `Top ${xmlEscape(String(c.top ?? "—"))}°C <span class="dot">·</span> Btm ${xmlEscape(
                    String(c.bottom ?? "—")
                  )}°C`
            }</small>
            ${i < items.length - 1 ? `<span class="flow-arrow" aria-hidden="true">→</span>` : ""}
          </div>`
          )
          .join("");
        const live = items
          .map(
            (c) => `<li>
            <span class="live-name">${xmlEscape(c.name)}</span>
            <span class="live-state"><i></i>Running</span>
          </li>`
          )
          .join("");
        return `<section class="card columns-card">
          ${head}
          <div class="columns-layout">
            <div class="col-row">${tanks}</div>
            <aside class="live-panel">
              <h3>Live Status</h3>
              <ul>${live}</ul>
            </aside>
          </div>
          <div class="status-banner">Overall Status · All Systems Normal</div>
        </section>`;
      }
      if (sec.kind === "html") {
        return `<section class="card">${head}${sec.html || ""}</section>`;
      }
      const headers = sec.headers || [];
      const rows = sec.rows || [];
      const th = headers.map((h) => `<th>${xmlEscape(h)}</th>`).join("");
      const tr = rows
        .map((row, ri) => {
          const cls = ri === rows.length - 1 && sec.highlightLast ? ' class="avg"' : "";
          return `<tr${cls}>${(row || []).map((cell) => `<td>${xmlEscape(cell)}</td>`).join("")}</tr>`;
        })
        .join("");
      return `<section class="card">${head}<div class="table-wrap"><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div></section>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    :root {
      --ink: #0f2744;
      --muted: #64748b;
      --muted-2: #94a3b8;
      --line: #e2e8f0;
      --soft: #f4f7f8;
      --brand: #2563eb;
      --brand-ui: #3b74e8;
      --sky: #eff6ff;
      --warn: #d97706;
      --high: #e11d48;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Plus Jakarta Sans", system-ui, sans-serif;
      color: var(--ink);
      background: #dedcd9;
      -webkit-font-smoothing: antialiased;
    }
    .page { max-width: 1120px; margin: 0 auto; padding: 20px 18px 40px; }
    .toolbar {
      display: flex; gap: 10px; justify-content: flex-end; margin-bottom: 12px;
    }
    .toolbar button {
      border: 0; border-radius: 12px; padding: 10px 16px; font-weight: 700; cursor: pointer;
      background: var(--brand-ui); color: #fff; font-size: 12px;
      font-family: inherit; letter-spacing: 0.01em;
    }
    .toolbar button.secondary {
      background: #fff; color: var(--brand-ui); border: 1px solid #bfdbfe;
    }
    .hero {
      border-radius: 16px;
      overflow: hidden;
      background: linear-gradient(135deg, #163a66 0%, #1d4ed8 52%, #0ea5e9 125%);
      color: #fff;
      padding: 22px 24px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
      margin-bottom: 14px;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .hero .eyebrow {
      font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 800;
      color: rgba(255,255,255,0.78);
    }
    .hero h1 {
      margin: 4px 0 2px; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15;
    }
    .hero p { margin: 0; opacity: 0.88; font-size: 13px; font-weight: 500; }
    .meta-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
    .meta-pill {
      background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.18);
      border-radius: 999px; padding: 6px 12px; font-size: 11px; display: flex; gap: 8px; align-items: center;
    }
    .meta-pill span {
      opacity: 0.78; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; font-size: 9px;
    }
    .meta-pill strong { font-weight: 800; }
    .kpi-grid {
      display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-bottom: 12px;
    }
    .kpi, .card {
      background: #fff; border: 1px solid rgba(226, 232, 240, 0.9); border-radius: 16px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
    }
    .kpi { padding: 14px; }
    .kpi-label {
      margin: 0; font-size: 10px; font-weight: 800; letter-spacing: 0.08em;
      text-transform: uppercase; color: var(--muted-2);
    }
    .kpi-value {
      margin: 6px 0 0; font-size: 22px; font-weight: 800; letter-spacing: -0.03em;
      color: var(--ink); line-height: 1.1; font-variant-numeric: tabular-nums;
    }
    .kpi-value span { margin-left: 4px; font-size: 11px; color: var(--muted-2); font-weight: 700; }
    .kpi-sub { margin: 4px 0 0; font-size: 10px; color: var(--muted-2); font-weight: 700; }
    .card { padding: 16px; margin-bottom: 12px; }
    .sec-head { margin-bottom: 12px; }
    .sec-head h2 {
      margin: 0; color: var(--ink); font-size: 13px; font-weight: 800;
      letter-spacing: -0.01em; line-height: 1.2;
    }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th {
      text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;
      color: var(--muted-2); padding: 8px 8px 10px; border-bottom: 1px solid var(--line);
      font-weight: 800;
    }
    td {
      padding: 9px 8px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #334155;
      font-variant-numeric: tabular-nums;
    }
    tr td:first-child { color: var(--ink); font-weight: 800; }
    tr.avg td { background: rgba(239, 246, 255, 0.85); color: var(--brand); font-weight: 800; }
    .columns-layout {
      display: grid; grid-template-columns: 1.75fr 0.75fr; gap: 14px; align-items: stretch;
    }
    .col-row {
      display: flex; flex-wrap: nowrap; gap: 4px; justify-content: space-between; align-items: flex-end;
      overflow-x: auto; padding-bottom: 2px;
    }
    .col-item {
      position: relative; flex: 1; min-width: 96px; text-align: center;
      display: flex; flex-direction: column; align-items: center;
    }
    .col-item strong {
      display: block; margin-top: 6px; font-size: 11px; font-weight: 800; color: var(--ink); line-height: 1.2;
    }
    .col-item small {
      color: #64748b; font-size: 10px; font-weight: 700; margin-top: 2px; line-height: 1.25;
    }
    .col-item small .dot { color: #cbd5e1; margin: 0 2px; }
    .run-pill {
      display: inline-block; background: #f0f9ff; color: #1d4ed8; border-radius: 999px;
      padding: 2px 8px; font-size: 9px; font-weight: 800; margin-bottom: 6px;
    }
    .tank-wrap { display: flex; justify-content: center; line-height: 0; }
    .flow-arrow {
      position: absolute; right: -8px; bottom: 52px; font-size: 16px; font-weight: 800; color: #cbd5e1;
      pointer-events: none;
    }
    .live-panel {
      border: 1px solid var(--line); border-radius: 14px; padding: 12px 12px 10px; background: #fff;
    }
    .live-panel h3 {
      margin: 0 0 10px; font-size: 13px; font-weight: 800; color: var(--ink); letter-spacing: -0.01em;
    }
    .live-panel ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    .live-panel li {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
    }
    .live-name { font-size: 12px; font-weight: 700; color: var(--ink); }
    .live-state {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 800; color: #2563eb;
    }
    .live-state i {
      width: 8px; height: 8px; border-radius: 999px; background: #0ea5e9; display: inline-block;
    }
    .status-banner {
      margin-top: 14px; text-align: center; background: #f0f9ff; color: #1d4ed8;
      border-radius: 12px; padding: 10px 12px; font-size: 12px; font-weight: 800;
    }
    .sum-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .sum-card { background: var(--soft); border-radius: 12px; padding: 12px; }
    .sum-value {
      margin: 6px 0 0; font-size: 16px; font-weight: 800; font-variant-numeric: tabular-nums;
    }
    .badge {
      display: inline-block; margin-top: 6px; background: #f0f9ff; color: #1d4ed8;
      border-radius: 999px; padding: 2px 8px; font-size: 10px; font-weight: 800;
    }
    .alerts { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    .alert {
      display: grid; gap: 2px; padding: 10px 12px; border-radius: 12px; border-left: 4px solid var(--warn);
      background: #fffbeb;
    }
    .alert.high { border-left-color: var(--high); background: #fff1f2; }
    .alert strong { font-size: 12px; font-weight: 800; }
    .alert span, .alert em {
      font-size: 10px; color: var(--muted); font-style: normal; font-weight: 600;
    }
    .legend-row { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 8px; }
    .legend {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 10px; font-weight: 700; color: #64748b;
    }
    .legend i { width: 14px; height: 3px; border-radius: 99px; display: inline-block; }
    .footer {
      margin-top: 6px; color: var(--muted-2); font-size: 10px; font-weight: 700;
      display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    }
    @media (max-width: 960px) {
      .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .columns-layout { grid-template-columns: 1fr; }
      .flow-arrow { display: none; }
    }
    @media print {
      body { background: #fff; }
      .toolbar { display: none !important; }
      .page { max-width: none; padding: 0; }
      .hero, .card, .kpi { box-shadow: none; }
      .card, .kpi, .columns-layout { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="toolbar">
      <button class="secondary" type="button" onclick="window.close()">Close</button>
      <button type="button" onclick="window.print()">Print / Save PDF</button>
    </div>
    <header class="hero">
      <div class="eyebrow">${company}</div>
      <h1>${title}</h1>
      <p>${subtitle}</p>
      <div class="meta-row">${meta}</div>
    </header>
    ${kpis ? `<div class="kpi-grid">${kpis}</div>` : ""}
    ${sections}
    <div class="footer">
      <span>${xmlEscape(opts.footerNote || `${opts.companyName || "Digital Distillery"} · Distillation overview`)}</span>
      <span>Generated ${xmlEscape(exportedAt)}</span>
    </div>
  </div>
</body>
</html>`;

  const safeName = String(opts.fileName || opts.title || "Dashboard_Report")
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_");
  const fileName = safeName.toLowerCase().endsWith(".html") ? safeName : `${safeName}.html`;
  triggerBlobDownload(new Blob([html], { type: "text/html;charset=utf-8" }), fileName);

  const win = window.open("", "_blank");
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  }
}
