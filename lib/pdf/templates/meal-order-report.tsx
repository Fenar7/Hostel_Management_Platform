import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { colors, fontSizes, layout } from "../styles";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: fontSizes.sm,
    color: colors.text,
    backgroundColor: colors.background,
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 40,
    paddingRight: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: fontSizes.title,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
  },
  headerSub: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 4,
  },
  table: {
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: colors.tableHeader,
  },
  tableColHeader: {
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 6,
  },
  tableCol: {
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 6,
  },
  tableCellHeader: {
    fontSize: fontSizes.sm,
    fontFamily: "Helvetica-Bold",
    color: colors.text,
  },
  tableCell: {
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  footer: {
    marginTop: 30,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
  },
});

export interface MealReportData {
  hostelName: string;
  periodLabel: string; // e.g., "Today (21 Jul 2026)", "This Week (15 Jul - 21 Jul)"
  generatedAt: string;
  tenants: Array<{
    name: string;
    roomBed: string;
    breakfast: number;
    lunch: number;
    dinner: number;
    total: number;
  }>;
  summary: {
    totalBreakfast: number;
    totalLunch: number;
    totalDinner: number;
    totalMeals: number;
  };
}

export function MealOrderReportDocument({ data }: { data: MealReportData }) {
  // Column widths: Name (30%), Room/Bed (20%), BF (12.5%), Lunch (12.5%), Dinner (12.5%), Total (12.5%)
  const colWidths = ["30%", "20%", "12.5%", "12.5%", "12.5%", "12.5%"];
  
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>MEAL ORDER REPORT</Text>
            <Text style={s.headerSub}>{data.hostelName}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: fontSizes.md, fontFamily: "Helvetica-Bold", color: colors.text }}>
              {data.periodLabel}
            </Text>
            <Text style={{ fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 4 }}>
              Generated: {data.generatedAt}
            </Text>
          </View>
        </View>

        {/* Table */}
        <View style={s.table}>
          {/* Table Header */}
          <View style={s.tableHeaderRow}>
            <View style={[s.tableColHeader, { width: colWidths[0] }]}>
              <Text style={s.tableCellHeader}>Tenant Name</Text>
            </View>
            <View style={[s.tableColHeader, { width: colWidths[1] }]}>
              <Text style={s.tableCellHeader}>Room / Bed</Text>
            </View>
            <View style={[s.tableColHeader, { width: colWidths[2], alignItems: "center" }]}>
              <Text style={s.tableCellHeader}>Breakfast</Text>
            </View>
            <View style={[s.tableColHeader, { width: colWidths[3], alignItems: "center" }]}>
              <Text style={s.tableCellHeader}>Lunch</Text>
            </View>
            <View style={[s.tableColHeader, { width: colWidths[4], alignItems: "center" }]}>
              <Text style={s.tableCellHeader}>Dinner</Text>
            </View>
            <View style={[s.tableColHeader, { width: colWidths[5], alignItems: "center" }]}>
              <Text style={s.tableCellHeader}>Total</Text>
            </View>
          </View>

          {/* Table Rows */}
          {data.tenants.map((t, i) => (
            <View key={i} style={s.tableRow}>
              <View style={[s.tableCol, { width: colWidths[0] }]}>
                <Text style={s.tableCell}>{t.name}</Text>
              </View>
              <View style={[s.tableCol, { width: colWidths[1] }]}>
                <Text style={s.tableCell}>{t.roomBed}</Text>
              </View>
              <View style={[s.tableCol, { width: colWidths[2], alignItems: "center" }]}>
                <Text style={s.tableCell}>{t.breakfast || "-"}</Text>
              </View>
              <View style={[s.tableCol, { width: colWidths[3], alignItems: "center" }]}>
                <Text style={s.tableCell}>{t.lunch || "-"}</Text>
              </View>
              <View style={[s.tableCol, { width: colWidths[4], alignItems: "center" }]}>
                <Text style={s.tableCell}>{t.dinner || "-"}</Text>
              </View>
              <View style={[s.tableCol, { width: colWidths[5], alignItems: "center" }]}>
                <Text style={[s.tableCell, { fontFamily: "Helvetica-Bold" }]}>{t.total || "-"}</Text>
              </View>
            </View>
          ))}
          
          {/* Summary Row */}
          <View style={[s.tableRow, { backgroundColor: colors.surface }]}>
            <View style={[s.tableCol, { width: "50%", alignItems: "flex-end", borderRightWidth: 0 }]}>
              <Text style={[s.tableCellHeader, { textAlign: "right" }]}>TOTAL COUNTS</Text>
            </View>
            <View style={[s.tableCol, { width: colWidths[2], alignItems: "center" }]}>
              <Text style={s.tableCellHeader}>{data.summary.totalBreakfast}</Text>
            </View>
            <View style={[s.tableCol, { width: colWidths[3], alignItems: "center" }]}>
              <Text style={s.tableCellHeader}>{data.summary.totalLunch}</Text>
            </View>
            <View style={[s.tableCol, { width: colWidths[4], alignItems: "center" }]}>
              <Text style={s.tableCellHeader}>{data.summary.totalDinner}</Text>
            </View>
            <View style={[s.tableCol, { width: colWidths[5], alignItems: "center" }]}>
              <Text style={s.tableCellHeader}>{data.summary.totalMeals}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>{data.hostelName} — Anywhere Node Hostel Management</Text>
          <Text style={s.footerText}>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
}
