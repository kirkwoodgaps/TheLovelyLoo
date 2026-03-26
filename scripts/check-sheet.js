const SHEET_ID = '1I-nJTAlbUkAqDPAx4XB06yAbY_x7g4mCBMogEE3khu4';

async function checkSheets() {
  const tabs = ['Campaigns', 'Daily', 'Monthly'];
  
  for (const tab of tabs) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${tab}`;
    try {
      const res = await fetch(url);
      console.log(`\n=== Tab "${tab}": status=${res.status} ===`);
      if (res.ok) {
        const text = await res.text();
        const lines = text.trim().split('\n');
        console.log(`  Total rows: ${lines.length} (including header)`);
        if (lines.length > 0) console.log(`  Header: ${lines[0]}`);
        if (lines.length > 1) console.log(`  Row 1: ${lines[1]}`);
        if (lines.length > 2) console.log(`  Row 2: ${lines[2]}`);
      } else {
        const body = await res.text();
        console.log(`  Error: ${body.substring(0, 300)}`);
      }
    } catch (e) {
      console.log(`Tab "${tab}": FETCH ERROR - ${e.message}`);
    }
  }
}

checkSheets().catch(console.error);
