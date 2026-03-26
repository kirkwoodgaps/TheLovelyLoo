const SHEET_ID = "1I-nJTAlbUkAqDPAx4XB06yAbY_x7g4mCBMogEE3khu4";
const TABS = ["Campaigns", "Daily", "Monthly", "Sheet1"];

async function testSheet() {
  console.log("Testing Google Sheet access...\n");

  for (const tab of TABS) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
    try {
      const res = await fetch(url);
      const text = await res.text();

      if (res.ok && text.trim() && !text.includes("<!DOCTYPE")) {
        const lines = text.split("\n").filter(l => l.trim());
        console.log(`Tab "${tab}": ${res.status} OK - ${lines.length} rows`);
        if (lines.length > 0) {
          console.log(`  Header: ${lines[0].substring(0, 120)}`);
        }
        if (lines.length > 1) {
          console.log(`  Row 1:  ${lines[1].substring(0, 120)}`);
        }
      } else if (res.ok && text.includes("<!DOCTYPE")) {
        console.log(`Tab "${tab}": Returned HTML (likely not shared publicly or tab doesn't exist)`);
      } else {
        console.log(`Tab "${tab}": ${res.status} - ${text.substring(0, 100)}`);
      }
    } catch (err) {
      console.log(`Tab "${tab}": ERROR - ${err.message}`);
    }
    console.log("");
  }
}

testSheet();
