// ============================================================
// GOOGLE ADS SCRIPT - The Lovely Loo Dashboard Export
// Paste this into Google Ads > Tools > Bulk actions > Scripts
// ============================================================

var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1I-nJTAlbUkAqDPAx4XB06yAbY_x7g4mCBMogEE3khu4/edit';

function main() {
  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);

  exportCampaignData(ss);
  exportDailyData(ss);
  exportMonthlySummary(ss);
  exportPhoneCallData(ss);

  Logger.log('Export complete at ' + new Date().toISOString());
}

function formatDate(date) {
  var y = date.getFullYear();
  var m = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1);
  var d = (date.getDate() < 10 ? '0' : '') + date.getDate();
  return '' + y + m + d;
}

function getDaysAgo(days) {
  var d = new Date();
  d.setDate(d.getDate() - days);
  return formatDate(d);
}

// ── Tab 1: Campaign Performance (last 90 days) ──────────────
function exportCampaignData(ss) {
  var sheet = getOrCreateSheet(ss, 'Campaigns');
  sheet.clear();
  sheet.appendRow([
    'Campaign', 'Status', 'Spend', 'Impressions', 'Clicks',
    'CTR', 'Avg CPC', 'Conversions', 'Cost Per Conversion', 'Conv Rate',
    'Last Updated'
  ]);
  var startDate = getDaysAgo(90);
  var endDate = formatDate(new Date());
  var report = AdsApp.report(
    'SELECT CampaignName, CampaignStatus, Cost, Impressions, Clicks, ' +
    'Ctr, AverageCpc, Conversions, CostPerConversion, ConversionRate ' +
    'FROM CAMPAIGN_PERFORMANCE_REPORT ' +
    'WHERE Impressions > 0 ' +
    'DURING ' + startDate + ',' + endDate
  );
  var rows = report.rows();
  var now = new Date().toISOString();
  while (rows.hasNext()) {
    var row = rows.next();
    sheet.appendRow([
      row['CampaignName'], row['CampaignStatus'], row['Cost'],
      row['Impressions'], row['Clicks'], row['Ctr'], row['AverageCpc'],
      row['Conversions'], row['CostPerConversion'], row['ConversionRate'], now
    ]);
  }
  Logger.log('Campaigns tab updated');
}

// ── Tab 2: Daily Totals (last 180 days) ─────────────────────
function exportDailyData(ss) {
  var sheet = getOrCreateSheet(ss, 'Daily');
  sheet.clear();
  sheet.appendRow([
    'Date', 'Spend', 'Impressions', 'Clicks', 'CTR',
    'Avg CPC', 'Conversions', 'Cost Per Conversion'
  ]);
  var startDate = getDaysAgo(180);
  var endDate = formatDate(new Date());
  var report = AdsApp.report(
    'SELECT Date, Cost, Impressions, Clicks, Ctr, ' +
    'AverageCpc, Conversions, CostPerConversion ' +
    'FROM ACCOUNT_PERFORMANCE_REPORT ' +
    'DURING ' + startDate + ',' + endDate
  );
  var rows = report.rows();
  while (rows.hasNext()) {
    var row = rows.next();
    sheet.appendRow([
      row['Date'], row['Cost'], row['Impressions'], row['Clicks'],
      row['Ctr'], row['AverageCpc'], row['Conversions'], row['CostPerConversion']
    ]);
  }
  Logger.log('Daily tab updated');
}

// ── Tab 3: Monthly Summary (aggregated from daily Date field) ──
function exportMonthlySummary(ss) {
  var sheet = getOrCreateSheet(ss, 'Monthly');
  sheet.clear();
  sheet.appendRow([
    'Month', 'Spend', 'Impressions', 'Clicks', 'CTR',
    'Avg CPC', 'Conversions', 'Cost Per Conversion'
  ]);
  var startDate = getDaysAgo(365);
  var endDate = formatDate(new Date());
  var report = AdsApp.report(
    'SELECT Date, Cost, Impressions, Clicks, Ctr, ' +
    'AverageCpc, Conversions, CostPerConversion ' +
    'FROM ACCOUNT_PERFORMANCE_REPORT ' +
    'DURING ' + startDate + ',' + endDate
  );
  var monthlyData = {};
  var rows = report.rows();
  while (rows.hasNext()) {
    var row = rows.next();
    var key = row['Date'].substring(0, 7);
    if (!monthlyData[key]) {
      monthlyData[key] = { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
    }
    monthlyData[key].spend += parseCurrency(row['Cost']);
    monthlyData[key].impressions += parseInt(row['Impressions'].replace(/,/g, ''), 10) || 0;
    monthlyData[key].clicks += parseInt(row['Clicks'].replace(/,/g, ''), 10) || 0;
    monthlyData[key].conversions += parseFloat(row['Conversions'].replace(/,/g, '')) || 0;
  }
  var months = Object.keys(monthlyData).sort();
  for (var i = 0; i < months.length; i++) {
    var m = monthlyData[months[i]];
    var ctr = m.impressions > 0 ? (m.clicks / m.impressions * 100).toFixed(2) + '%' : '0%';
    var avgCpc = m.clicks > 0 ? '$' + (m.spend / m.clicks).toFixed(2) : '$0.00';
    var costPerConv = m.conversions > 0 ? '$' + (m.spend / m.conversions).toFixed(2) : '$0.00';
    sheet.appendRow([
      months[i], '$' + m.spend.toFixed(2), m.impressions, m.clicks,
      ctr, avgCpc, m.conversions.toFixed(1), costPerConv
    ]);
  }
  Logger.log('Monthly tab updated');
}

// ── Tab 4: Phone Call Details (individual call records) ──────
// Uses CALL_METRICS_CALL_DETAILS_REPORT for individual tracked calls
function exportPhoneCallData(ss) {
  var sheet = getOrCreateSheet(ss, 'PhoneCalls');
  sheet.clear();
  sheet.appendRow([
    'Date', 'Campaign', 'Ad Group', 'Call Type', 'Caller Country',
    'Caller Area Code', 'Call Duration (sec)', 'Call Start Time',
    'Call End Time', 'Call Status', 'Last Updated'
  ]);

  try {
    var startDate = getDaysAgo(90);
    var endDate = formatDate(new Date());
    var now = new Date().toISOString();

    var report = AdsApp.report(
      'SELECT Date, CampaignName, AdGroupName, CallType, CallerCountryCallingCode, ' +
      'CallerNationalDesignatedCode, CallDuration, CallStartTime, CallEndTime, CallStatus ' +
      'FROM CALL_METRICS_CALL_DETAILS_REPORT ' +
      'DURING ' + startDate + ',' + endDate
    );

    var rows = report.rows();
    var count = 0;
    while (rows.hasNext()) {
      var row = rows.next();
      sheet.appendRow([
        row['Date'] || '',
        row['CampaignName'] || '',
        row['AdGroupName'] || '',
        row['CallType'] || '',
        row['CallerCountryCallingCode'] || '',
        row['CallerNationalDesignatedCode'] || '',
        row['CallDuration'] || '0',
        row['CallStartTime'] || '',
        row['CallEndTime'] || '',
        row['CallStatus'] || '',
        now
      ]);
      count++;
    }

    if (count === 0) {
      sheet.appendRow(['No call records found', '', '', '', '', '', '', '', '', '', now]);
    }

    Logger.log('PhoneCalls tab updated with ' + count + ' call records');
  } catch (e) {
    Logger.log('Phone call details export failed: ' + e.message);
    // Fallback: try phone impressions from campaign report
    sheet.clear();
    sheet.appendRow([
      'Date', 'Campaign', 'Ad Group', 'Call Type', 'Caller Country',
      'Caller Area Code', 'Call Duration (sec)', 'Call Start Time',
      'Call End Time', 'Call Status', 'Last Updated'
    ]);
    sheet.appendRow(['Call details not available (' + e.message + ')', '', '', '', '', '', '', '', '', '', new Date().toISOString()]);
  }
}

// ── Helpers ──────────────────────────────────────────────────
function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) { sheet = ss.insertSheet(name); }
  return sheet;
}

function parseCurrency(str) {
  return parseFloat(str.replace(/[$,]/g, '')) || 0;
}
