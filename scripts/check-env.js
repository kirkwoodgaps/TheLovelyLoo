const ck = process.env.GRAVITY_FORMS_CONSUMER_KEY;
const cs = process.env.GRAVITY_FORMS_CONSUMER_SECRET;

console.log("GRAVITY_FORMS_CONSUMER_KEY exists:", !!ck);
console.log("GRAVITY_FORMS_CONSUMER_KEY starts with:", ck ? ck.substring(0, 6) : "NOT SET");
console.log("GRAVITY_FORMS_CONSUMER_SECRET exists:", !!cs);
console.log("GRAVITY_FORMS_CONSUMER_SECRET starts with:", cs ? cs.substring(0, 6) : "NOT SET");

if (ck && cs) {
  console.log("\nCredentials found. Testing API connection...");
  const auth = Buffer.from(`${ck}:${cs}`).toString("base64");
  
  fetch("https://thelovelyloo.com/wp-json/gf/v2/forms", {
    headers: { Authorization: `Basic ${auth}` },
  })
    .then((res) => {
      console.log("API Response status:", res.status, res.statusText);
      return res.text();
    })
    .then((body) => {
      try {
        const data = JSON.parse(body);
        const forms = Object.values(data);
        console.log("SUCCESS - Found", forms.length, "forms:");
        forms.forEach((f) => console.log(`  - Form ${f.id}: ${f.title} (${f.entries} entries)`));
      } catch {
        console.log("Response body:", body.substring(0, 500));
      }
    })
    .catch((err) => console.error("Fetch error:", err));
} else {
  console.log("\nENV VARS NOT SET. Please add them in the Vars section of the sidebar.");
}
