// Fetch form fields and recent entries from the working gf/v2 endpoint

const CK = process.env.GRAVITY_FORMS_CONSUMER_KEY;
const CS = process.env.GRAVITY_FORMS_CONSUMER_SECRET;
const BASE = "https://thelovelyloo.com/wp-json/gf/v2";
const basicAuth = Buffer.from(`${CK}:${CS}`).toString("base64");
const headers = { Authorization: `Basic ${basicAuth}` };

async function fetchJson(path) {
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) {
    console.log(`[v0] ${path} => ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log(`[v0] Body: ${text.substring(0, 300)}`);
    return null;
  }
  return res.json();
}

async function main() {
  // Get detailed form info for each form (fields, etc.)
  for (const formId of [1, 2, 3, 4]) {
    console.log(`\n=== FORM ${formId} DETAILS ===`);
    const form = await fetchJson(`/forms/${formId}`);
    if (form) {
      console.log(`Title: ${form.title}`);
      console.log(`Date Created: ${form.date_created}`);
      if (form.fields) {
        console.log(`Fields (${form.fields.length}):`);
        for (const f of form.fields) {
          console.log(`  - ID ${f.id}: ${f.label} (type: ${f.type})`);
          if (f.choices) {
            console.log(`    Choices: ${f.choices.map(c => c.text).join(", ")}`);
          }
        }
      }
    }
  }

  // Fetch recent entries from form 3 (New Quote - most popular)
  console.log(`\n=== RECENT ENTRIES - FORM 3 (New Quote) ===`);
  const entries3 = await fetchJson(`/forms/3/entries?paging[page_size]=5&sorting[key]=date_created&sorting[direction]=DESC`);
  if (entries3) {
    const entryList = entries3.entries || entries3;
    const arr = Array.isArray(entryList) ? entryList : [];
    console.log(`Total entries returned: ${arr.length}`);
    if (arr.length > 0) {
      console.log(`\nFirst entry keys: ${Object.keys(arr[0]).join(", ")}`);
      // Print first 2 entries in detail
      for (let i = 0; i < Math.min(2, arr.length); i++) {
        console.log(`\n--- Entry ${i + 1} ---`);
        console.log(JSON.stringify(arr[i], null, 2).substring(0, 1000));
      }
    }
  }

  // Also check entries endpoint directly
  console.log(`\n=== GLOBAL ENTRIES ENDPOINT ===`);
  const globalEntries = await fetchJson(`/entries?paging[page_size]=3&sorting[key]=date_created&sorting[direction]=DESC`);
  if (globalEntries) {
    const arr = Array.isArray(globalEntries) ? globalEntries : globalEntries.entries || [];
    console.log(`Returned: ${arr.length} entries`);
    if (arr.length > 0) {
      console.log(`First entry: ${JSON.stringify(arr[0]).substring(0, 500)}`);
    }
  }

  // Check form 4 (New Quote Popup) entries too
  console.log(`\n=== RECENT ENTRIES - FORM 4 (New Quote Popup) ===`);
  const entries4 = await fetchJson(`/forms/4/entries?paging[page_size]=3&sorting[key]=date_created&sorting[direction]=DESC`);
  if (entries4) {
    const arr = Array.isArray(entries4) ? entries4 : entries4.entries || [];
    console.log(`Total: ${arr.length}`);
    if (arr.length > 0) {
      console.log(`First entry: ${JSON.stringify(arr[0], null, 2).substring(0, 800)}`);
    }
  }
}

main().catch(err => console.error("[v0] Fatal:", err));
