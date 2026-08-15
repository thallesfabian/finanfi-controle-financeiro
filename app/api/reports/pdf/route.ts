import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { prisma } from "@/lib/prisma";
import { sessionUserId } from "@/lib/auth";
import { journeyMetrics } from "@/lib/journey";

export const runtime = "nodejs";
const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function line(doc: PDFKit.PDFDocument, label: string, value: string, y: number) {
  doc.font("Helvetica").fontSize(10).fillColor("#667085").text(label, 50, y);
  doc.font("Helvetica-Bold").fillColor("#172033").text(value, 330, y, { width: 215, align: "right" });
  doc.moveTo(50, y + 17).lineTo(545, y + 17).strokeColor("#e7eaf0").stroke();
}

export async function GET(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
  const now = new Date();
  const year = Math.min(2100, Math.max(2000, Number(req.nextUrl.searchParams.get("year")) || now.getFullYear()));
  const monthParam = req.nextUrl.searchParams.get("month");
  const month = monthParam ? Math.min(12, Math.max(1, Number(monthParam))) : null;
  const start = new Date(Date.UTC(year, month ? month - 1 : 0, 1));
  const end = new Date(Date.UTC(year + (month ? 0 : 1), month || 0, 1));
  const journeys = await prisma.journey.findMany({ where: { userId, date: { gte: start, lt: end } }, include: { costs: true }, orderBy: { date: "asc" } });
  const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: month ? `Relatório ${months[month - 1]} ${year}` : `Relatório anual ${year}`, Author: "finanfi" } });
  const chunks: Buffer[] = [];
  doc.on("data", chunk => chunks.push(Buffer.from(chunk)));
  const done = new Promise<Buffer>((resolve, reject) => { doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  doc.rect(0, 0, 595, 105).fill("#171b35");
  doc.font("Helvetica-Bold").fontSize(25).fillColor("#ffffff").text("finanfi", 50, 36);
  doc.font("Helvetica").fontSize(10).fillColor("#dbe0ff").text(`Relatório financeiro de ${user.name}`, 50, 70);
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#172033").text(month ? `${months[month - 1]} de ${year}` : `Consolidado anual de ${year}`, 50, 135);

  if (month) {
    const rows = journeys.map(journey => ({ journey, metrics: journeyMetrics(journey) }));
    const gross = rows.reduce((sum, row) => sum + row.metrics.gross, 0), costs = rows.reduce((sum, row) => sum + row.metrics.costs, 0), net = gross - costs, km = rows.reduce((sum, row) => sum + row.metrics.km, 0), hours = rows.reduce((sum, row) => sum + row.metrics.hours, 0);
    line(doc, "Faturamento bruto", money(gross), 177); line(doc, "Custos informados", money(costs), 207); line(doc, "Lucro líquido", money(net), 237); line(doc, "Dias trabalhados", String(rows.length), 267); line(doc, "Quilômetros rodados", `${km.toFixed(1)} km`, 297); line(doc, "Horas trabalhadas", `${hours.toFixed(1)} h`, 327);
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#172033").text("Detalhamento dos dias", 50, 375);
    let y = 405;
    doc.fontSize(9).fillColor("#667085").text("DATA", 50, y).text("HORAS", 125, y).text("KM", 190, y).text("BRUTO", 265, y).text("CUSTOS", 365, y).text("LÍQUIDO", 455, y);
    y += 20;
    for (const row of rows) {
      if (y > 750) { doc.addPage(); y = 55; }
      const m = row.metrics;
      doc.font("Helvetica").fontSize(8.5).fillColor("#172033").text(row.journey.date.toLocaleDateString("pt-BR", { timeZone: "UTC" }), 50, y).text(`${m.hours.toFixed(1)}h`, 125, y).text(m.km.toFixed(1), 190, y).text(money(m.gross), 265, y).text(money(m.costs), 365, y).text(money(m.net), 455, y);
      doc.moveTo(50, y + 14).lineTo(545, y + 14).strokeColor("#eef0f4").stroke(); y += 24;
    }
  } else {
    const grouped = Array.from({ length: 12 }, (_, index) => {
      const rows = journeys.filter(item => item.date.getUTCMonth() === index).map(journeyMetrics);
      const gross = rows.reduce((sum, item) => sum + item.gross, 0), costs = rows.reduce((sum, item) => sum + item.costs, 0);
      return { month: months[index], days: rows.length, gross, costs, net: gross - costs, km: rows.reduce((sum, item) => sum + item.km, 0) };
    });
    let y = 180;
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#667085").text("MÊS", 50, y).text("DIAS", 160, y).text("KM", 210, y).text("BRUTO", 285, y).text("CUSTOS", 380, y).text("LÍQUIDO", 465, y); y += 22;
    for (const row of grouped) { doc.font("Helvetica").fontSize(9).fillColor("#172033").text(row.month, 50, y).text(String(row.days), 160, y).text(row.km.toFixed(1), 210, y).text(money(row.gross), 285, y).text(money(row.costs), 380, y).text(money(row.net), 465, y); doc.moveTo(50, y + 15).lineTo(545, y + 15).strokeColor("#e7eaf0").stroke(); y += 28; }
    const gross = grouped.reduce((sum, item) => sum + item.gross, 0), costs = grouped.reduce((sum, item) => sum + item.costs, 0);
    doc.rect(50, y + 8, 495, 72).fill("#f5f7fb"); doc.font("Helvetica-Bold").fontSize(11).fillColor("#172033").text(`Total bruto: ${money(gross)}`, 65, y + 25).text(`Total líquido: ${money(gross - costs)}`, 300, y + 25).text(`Total de custos: ${money(costs)}`, 65, y + 50).text(`KM no ano: ${grouped.reduce((sum, item) => sum + item.km, 0).toFixed(1)} km`, 300, y + 50);
  }
  doc.font("Helvetica").fontSize(8).fillColor("#98a2b3").text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 50, 775, { width: 495, align: "center", lineBreak: false });
  doc.end();
  const pdf = await done;
  const filename = month ? `relatorio-${year}-${String(month).padStart(2, "0")}.pdf` : `relatorio-anual-${year}.pdf`;
  return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
}
