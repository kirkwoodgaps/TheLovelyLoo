const SHEET_ID = "1I-nJTAlbUkAqDPAx4XB06yAbY_x7g4mCBMogEE3khu4";

// Fetch a sheet tab as CSV from a publicly shared (view) Google Sheet
async function fetchSheetCSV(sheetName: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, { next: { revalidate: 300 } }); // cache 5 min
  if (!res.ok) {
    console.error(`[v0] Failed to fetch sheet "${sheetName}": ${res.status}`);
    return "";
  }
  return res.text();
}

// Parse CSV text into array of objects using header row as keys
function parseCSV(csv: string): Record<string, string>[] {
  if (!csv.trim()) return [];

  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim().replace(/^"|"$/g, "")] = (values[idx] || "")
        .trim()
        .replace(/^"|"$/g, "");
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseCurrency(val: string): number {
  return parseFloat(val.replace(/[$,]/g, "")) || 0;
}

function parseNumber(val: string): number {
  return parseInt(val.replace(/,/g, ""), 10) || 0;
}

function parsePercent(val: string): number {
  return parseFloat(val.replace(/%/g, "")) || 0;
}

// ── Campaign Performance ────────────────────────────────────

export interface GoogleAdsCampaign {
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  avgCpc: number;
  conversions: number;
  costPerConversion: number;
  convRate: number;
  phoneImpressions: number;
  phoneCalls: number;
  phoneCallRate: number;
}

export async function fetchGoogleAdsCampaigns(): Promise<GoogleAdsCampaign[]> {
  const csv = await fetchSheetCSV("Campaigns");
  const rows = parseCSV(csv);

  return rows.map((r) => ({
    name: r["Campaign"] || "Unknown",
    status: r["Status"] || "unknown",
    spend: parseCurrency(r["Spend"]),
    impressions: parseNumber(r["Impressions"]),
    clicks: parseNumber(r["Clicks"]),
    ctr: parsePercent(r["CTR"]),
    avgCpc: parseCurrency(r["Avg CPC"]),
    conversions: parseFloat(r["Conversions"]?.replace(/,/g, "") || "0") || 0,
    costPerConversion: parseCurrency(r["Cost Per Conversion"]),
    convRate: parsePercent(r["Conv Rate"]),
    phoneImpressions: parseNumber(r["Phone Impressions"] || "0"),
    phoneCalls: parseNumber(r["Phone Calls"] || "0"),
    phoneCallRate: parsePercent(r["Phone Call Rate"] || "0"),
  }));
}

// ── Daily Performance ───────────────────────────────────────

export interface GoogleAdsDaily {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  phoneCalls: number;
}

export async function fetchGoogleAdsDaily(): Promise<GoogleAdsDaily[]> {
  const csv = await fetchSheetCSV("Daily");
  const rows = parseCSV(csv);

  return rows
    .map((r) => ({
      date: r["Date"] || "",
      spend: parseCurrency(r["Spend"]),
      impressions: parseNumber(r["Impressions"]),
      clicks: parseNumber(r["Clicks"]),
      conversions:
        parseFloat(r["Conversions"]?.replace(/,/g, "") || "0") || 0,
      phoneCalls: parseNumber(r["Phone Calls"] || "0"),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ── Monthly Performance ─────────────────────────────────────

export interface GoogleAdsMonthly {
  month: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export async function fetchGoogleAdsMonthly(): Promise<GoogleAdsMonthly[]> {
  // Try the Monthly tab first
  const csv = await fetchSheetCSV("Monthly");
  const rows = parseCSV(csv);

  if (rows.length > 0) {
    return rows
      .map((r) => ({
        month: r["Month"] || "",
        spend: parseCurrency(r["Spend"]),
        impressions: parseNumber(r["Impressions"]),
        clicks: parseNumber(r["Clicks"]),
        conversions:
          parseFloat(r["Conversions"]?.replace(/,/g, "") || "0") || 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  // Fallback: aggregate from Daily tab
  const daily = await fetchGoogleAdsDaily();
  if (daily.length === 0) return [];

  const monthMap: Record<string, GoogleAdsMonthly> = {};
  for (const d of daily) {
    const month = d.date.substring(0, 7); // "YYYY-MM"
    if (!monthMap[month]) {
      monthMap[month] = { month, spend: 0, impressions: 0, clicks: 0, conversions: 0 };
    }
    monthMap[month].spend += d.spend;
    monthMap[month].impressions += d.impressions;
    monthMap[month].clicks += d.clicks;
    monthMap[month].conversions += d.conversions;
  }

  return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
}

// ── Phone Call Detail Records (separate tab) ────────────────

export interface GoogleAdsCallRecord {
  date: string;
  campaign: string;
  adGroup: string;
  callType: string;
  callerCountry: string;
  callerAreaCode: string;
  durationSec: number;
  startTime: string;
  endTime: string;
  callStatus: string;
}

export async function fetchGoogleAdsCallRecords(): Promise<GoogleAdsCallRecord[]> {
  const csv = await fetchSheetCSV("PhoneCalls");
  const rows = parseCSV(csv);
  return rows
    .filter(
      (r) =>
        r["Date"] &&
        !r["Date"].startsWith("No call") &&
        !r["Date"].startsWith("Call details")
    )
    .map((r) => ({
      date: r["Date"] || "",
      campaign: r["Campaign"] || "",
      adGroup: r["Ad Group"] || "",
      callType: r["Call Type"] || "",
      callerCountry: r["Caller Country"] || "",
      callerAreaCode: r["Caller Area Code"] || "",
      durationSec: parseNumber(r["Call Duration (sec)"] || "0"),
      startTime: r["Call Start Time"] || "",
      endTime: r["Call End Time"] || "",
      callStatus: r["Call Status"] || "",
    }))
    .sort((a, b) => b.date.localeCompare(a.date)); // most recent first
}

// ── Aggregated Summary ──────────────────────────────────────

export interface GoogleAdsSummary {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalPhoneCalls: number;
  avgCtr: number;
  avgCpc: number;
  costPerConversion: number;
  campaigns: GoogleAdsCampaign[];
  monthly: GoogleAdsMonthly[];
  daily: GoogleAdsDaily[];
  callRecords: GoogleAdsCallRecord[];
  hasData: boolean;
}

const EMPTY_SUMMARY: GoogleAdsSummary = {
  totalSpend: 0,
  totalImpressions: 0,
  totalClicks: 0,
  totalConversions: 0,
  totalPhoneCalls: 0,
  avgCtr: 0,
  avgCpc: 0,
  costPerConversion: 0,
  campaigns: [],
  monthly: [],
  daily: [],
  callRecords: [],
  hasData: false,
};

export async function fetchGoogleAdsSummary(): Promise<GoogleAdsSummary> {
  try {
    const [campaigns, monthly, daily, callRecords] = await Promise.all([
      fetchGoogleAdsCampaigns().catch(() => []),
      fetchGoogleAdsMonthly().catch(() => []),
      fetchGoogleAdsDaily().catch(() => []),
      fetchGoogleAdsCallRecords().catch(() => []),
    ]);

    // Aggregate phone calls per campaign from call records
    const phoneByCampaign: Record<string, number> = {};
    for (const call of callRecords) {
      phoneByCampaign[call.campaign] = (phoneByCampaign[call.campaign] || 0) + 1;
    }
    for (const c of campaigns) {
      if (phoneByCampaign[c.name]) {
        c.phoneCalls = phoneByCampaign[c.name];
      }
    }

    const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
    const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
    const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
    const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
    const totalPhoneCalls = callRecords.length;

    const hasData =
      campaigns.length > 0 || monthly.length > 0 || daily.length > 0;

    return {
      totalSpend,
      totalImpressions,
      totalClicks,
      totalConversions,
      totalPhoneCalls,
      avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      avgCpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      costPerConversion: totalConversions > 0 ? totalSpend / totalConversions : 0,
      campaigns,
      monthly,
      daily,
      callRecords,
      hasData,
    };
  } catch (error) {
    console.error("[v0] Google Ads fetch failed:", error);
    return EMPTY_SUMMARY;
  }
}
