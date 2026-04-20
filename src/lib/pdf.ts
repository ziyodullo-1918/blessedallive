import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMoney, formatNumber, t } from "./i18n";

// Bold green + white palette
const BRAND = {
  green: [22, 163, 74] as [number, number, number],
  greenDark: [21, 128, 61] as [number, number, number],
  greenDeep: [20, 83, 45] as [number, number, number],
  greenSoft: [187, 247, 208] as [number, number, number],
  greenLight: [220, 252, 231] as [number, number, number],
  greenWash: [240, 253, 244] as [number, number, number],
  ink: [15, 23, 16] as [number, number, number],
  muted: [90, 110, 96] as [number, number, number],
  line: [187, 247, 208] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const PAGE_MARGIN = 32;

function header(doc: jsPDF, title: string, subtitle: string) {
  const w = doc.internal.pageSize.getWidth();

  // Solid green header band — strong brand presence
  doc.setFillColor(...BRAND.green);
  doc.rect(0, 0, w, 92, "F");

  // Inner darker stripe at bottom for depth
  doc.setFillColor(...BRAND.greenDark);
  doc.rect(0, 88, w, 4, "F");

  // App name
  doc.setTextColor(...BRAND.greenLight);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(t.appName.toUpperCase(), PAGE_MARGIN, 26);

  // Title
  doc.setTextColor(...BRAND.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(title, PAGE_MARGIN, 54);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.greenLight);
  doc.text(subtitle, PAGE_MARGIN, 74);

  // Generated stamp (right)
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.greenLight);
  const stamp = `${t.generatedAt}: ${new Date().toLocaleString("uz-UZ")}`;
  doc.text(stamp, w - PAGE_MARGIN, 26, { align: "right" });
}

function statRow(
  doc: jsPDF,
  y: number,
  items: { label: string; value: string }[],
) {
  const w = doc.internal.pageSize.getWidth();
  const gap = 10;
  const colW = (w - PAGE_MARGIN * 2 - gap * (items.length - 1)) / items.length;
  const cardH = 58;

  items.forEach((it, i) => {
    const x = PAGE_MARGIN + i * (colW + gap);
    // Light green tinted card
    doc.setFillColor(...BRAND.greenWash);
    doc.roundedRect(x, y, colW, cardH, 8, 8, "F");
    // Left accent bar
    doc.setFillColor(...BRAND.green);
    doc.roundedRect(x, y, 4, cardH, 2, 2, "F");
    // Label
    doc.setTextColor(...BRAND.greenDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(it.label.toUpperCase(), x + 14, y + 22);
    // Value
    doc.setTextColor(...BRAND.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(it.value, x + 14, y + 44);
  });
  return y + cardH + 14;
}

function sectionTitle(doc: jsPDF, y: number, text: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND.green);
  doc.roundedRect(PAGE_MARGIN, y, w - PAGE_MARGIN * 2, 22, 4, 4, "F");
  doc.setTextColor(...BRAND.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(text, PAGE_MARGIN + 10, y + 15);
  return y + 22;
}

function footer(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    // Green bottom band
    doc.setFillColor(...BRAND.greenWash);
    doc.rect(0, h - 28, w, 28, "F");
    doc.setDrawColor(...BRAND.green);
    doc.setLineWidth(1.2);
    doc.line(0, h - 28, w, h - 28);
    doc.setTextColor(...BRAND.greenDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(t.appName, PAGE_MARGIN, h - 11);
    doc.setFont("helvetica", "normal");
    doc.text(`${i} / ${pages}`, w - PAGE_MARGIN, h - 11, { align: "right" });
  }
}

const TABLE_COMMON = {
  theme: "grid" as const,
  headStyles: {
    fillColor: BRAND.green,
    textColor: 255,
    fontSize: 9,
    fontStyle: "bold" as const,
    halign: "left" as const,
    cellPadding: 6,
  },
  footStyles: {
    fillColor: BRAND.greenSoft,
    textColor: BRAND.greenDeep,
    fontSize: 9,
    fontStyle: "bold" as const,
    cellPadding: 6,
  },
  bodyStyles: {
    fontSize: 9,
    textColor: BRAND.ink,
    cellPadding: 5,
    lineColor: BRAND.line,
    lineWidth: 0.3,
  },
  alternateRowStyles: { fillColor: BRAND.greenWash },
  margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
};

export type WorkerEntry = {
  work_date: string;
  product_name: string;
  category_name?: string | null;
  quantity: number;
  unit_price: number;
  total: number;
};

export function workerMonthlyPdf(opts: {
  workerName: string;
  workerCode: string;
  from: string;
  to: string;
  entries: WorkerEntry[];
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  header(
    doc,
    t.workersMonthlyReport,
    `${opts.workerName} • ID: ${opts.workerCode} • ${opts.from} → ${opts.to}`,
  );

  const totalQty = opts.entries.reduce((s, e) => s + Number(e.quantity), 0);
  const totalSum = opts.entries.reduce((s, e) => s + Number(e.total), 0);

  const y = statRow(doc, 110, [
    { label: t.totalEntries, value: String(opts.entries.length) },
    { label: t.totalProduction, value: `${formatNumber(totalQty)} ${t.units}` },
    { label: t.totalEarnings, value: formatMoney(totalSum) },
  ]);

  autoTable(doc, {
    startY: y,
    head: [[t.date, t.product, t.category, t.quantity, t.price, t.total]],
    body: opts.entries.map((e) => [
      e.work_date,
      e.product_name,
      e.category_name ?? "—",
      formatNumber(e.quantity),
      formatMoney(Number(e.unit_price)),
      formatMoney(Number(e.total)),
    ]),
    foot: [
      [
        { content: t.overallTotal, colSpan: 3, styles: { halign: "right" } },
        { content: formatNumber(totalQty), styles: { halign: "right" } },
        { content: "", styles: { halign: "right" } },
        { content: formatMoney(totalSum), styles: { halign: "right" } },
      ],
    ],
    ...TABLE_COMMON,
    columnStyles: {
      0: { cellWidth: 64 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 80 },
      3: { cellWidth: 55, halign: "right" },
      4: { cellWidth: 75, halign: "right" },
      5: { cellWidth: 85, halign: "right" },
    },
  });

  footer(doc);
  doc.save(`hisobot_${opts.workerCode}_${opts.from}_${opts.to}.pdf`);
}

export type ProductRow = {
  product_name: string;
  category_name?: string | null;
  quantity: number;
  total: number;
};

export function productsPdf(opts: {
  from: string;
  to: string;
  rows: ProductRow[];
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  header(doc, t.productsReport, `${opts.from} → ${opts.to}`);

  const totalQty = opts.rows.reduce((s, r) => s + Number(r.quantity), 0);
  const totalSum = opts.rows.reduce((s, r) => s + Number(r.total), 0);

  const y = statRow(doc, 110, [
    { label: t.products, value: String(opts.rows.length) },
    { label: t.totalProduction, value: `${formatNumber(totalQty)} ${t.units}` },
    { label: t.overallTotal, value: formatMoney(totalSum) },
  ]);

  autoTable(doc, {
    startY: y,
    head: [[t.product, t.category, `${t.quantity} (${t.units})`, t.total]],
    body: opts.rows.map((r) => [
      r.product_name,
      r.category_name ?? "—",
      formatNumber(r.quantity),
      formatMoney(Number(r.total)),
    ]),
    foot: [
      [
        { content: t.overallTotal, colSpan: 2, styles: { halign: "right" } },
        { content: formatNumber(totalQty), styles: { halign: "right" } },
        { content: formatMoney(totalSum), styles: { halign: "right" } },
      ],
    ],
    ...TABLE_COMMON,
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 110 },
      2: { cellWidth: 90, halign: "right" },
      3: { cellWidth: 110, halign: "right" },
    },
  });

  footer(doc);
  doc.save(`mahsulotlar_${opts.from}_${opts.to}.pdf`);
}

export type SalaryRow = {
  worker_name: string;
  worker_code: string;
  quantity: number;
  total: number;
  entries: number;
  products: { product_name: string; quantity: number; total: number }[];
};

export function salariesPdf(opts: {
  from: string;
  to: string;
  rows: SalaryRow[];
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  header(doc, t.salariesReport, `${opts.from} → ${opts.to}`);

  const totalSum = opts.rows.reduce((s, r) => s + Number(r.total), 0);
  const totalQty = opts.rows.reduce((s, r) => s + Number(r.quantity), 0);

  let y = statRow(doc, 110, [
    { label: t.workers, value: String(opts.rows.length) },
    { label: t.totalProduction, value: `${formatNumber(totalQty)} ${t.units}` },
    { label: t.overallTotal, value: formatMoney(totalSum) },
  ]);

  // Summary heading
  y = sectionTitle(doc, y, t.salariesReport.toUpperCase()) + 6;

  // Summary table — 5 columns
  autoTable(doc, {
    startY: y,
    head: [["#", t.workerName, "ID", `${t.quantity} (${t.units})`, t.totalEarnings]],
    body: opts.rows.map((r, i) => [
      String(i + 1),
      r.worker_name,
      r.worker_code,
      formatNumber(r.quantity),
      formatMoney(Number(r.total)),
    ]),
    foot: [
      [
        { content: t.overallTotal, colSpan: 3, styles: { halign: "right" } },
        { content: formatNumber(totalQty), styles: { halign: "right" } },
        { content: formatMoney(totalSum), styles: { halign: "right" } },
      ],
    ],
    ...TABLE_COMMON,
    columnStyles: {
      0: { cellWidth: 32, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 80 },
      3: { cellWidth: 90, halign: "right" },
      4: { cellWidth: 130, halign: "right" },
    },
  });

  // Per-worker product breakdown
  for (const r of opts.rows) {
    if (r.products.length === 0) continue;
    const lastY = (doc as any).lastAutoTable?.finalY ?? y;
    const pageH = doc.internal.pageSize.getHeight();
    let startY = lastY + 22;
    if (startY > pageH - 140) {
      doc.addPage();
      startY = 50;
    }

    startY = sectionTitle(
      doc,
      startY,
      `${r.worker_name}  •  #${r.worker_code}  —  ${t.productsBreakdown}`,
    );

    autoTable(doc, {
      startY: startY + 6,
      head: [[t.product, `${t.quantity} (${t.units})`, t.total]],
      body: r.products.map((p) => [
        p.product_name,
        formatNumber(p.quantity),
        formatMoney(Number(p.total)),
      ]),
      foot: [
        [
          { content: t.overallTotal, styles: { halign: "right" } },
          { content: formatNumber(r.quantity), styles: { halign: "right" } },
          { content: formatMoney(r.total), styles: { halign: "right" } },
        ],
      ],
      ...TABLE_COMMON,
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 110, halign: "right" },
        2: { cellWidth: 130, halign: "right" },
      },
    });
  }

  footer(doc);
  doc.save(`maoshlar_${opts.from}_${opts.to}.pdf`);
}
