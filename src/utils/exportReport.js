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
