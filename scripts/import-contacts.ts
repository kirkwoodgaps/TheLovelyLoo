import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// Read the CSV file
const csvPath = process.argv[2] || "contacts.csv"
const csvContent = fs.readFileSync(csvPath, "utf-8")

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ""))
      current = ""
    } else {
      current += char
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ""))
  return result
}

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.split(/\r?\n/)
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0])
  console.log(`Found ${headers.length} columns`)
  
  // Find important column indices
  const primaryEmailIdx = headers.findIndex(h => h === "Primary Email")
  console.log(`Primary Email at column ${primaryEmailIdx}`)
  
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line || !line.trim()) continue

    try {
      const values = parseCSVLine(line)
      const row: Record<string, string> = {}
      headers.forEach((header, idx) => {
        if (header) {
          row[header] = values[idx] || ""
        }
      })
      rows.push(row)
    } catch (e) {
      console.log(`Skipping malformed row ${i}`)
      continue
    }
  }

  return rows
}

async function importContacts() {
  console.log("Parsing CSV...")
  const rows = parseCSV(csvContent)
  console.log(`Parsed ${rows.length} contacts`)

  const contacts = rows.map((row) => {
    // Find email - prioritize Primary Email, then Email column, then any email field
    let email = row["Primary Email"] || row["Email"] || ""
    if (!email || !email.includes("@")) {
      for (const [key, value] of Object.entries(row)) {
        if (key.endsWith("Email") && value && value.includes("@")) {
          email = value
          break
        }
      }
    }

    // Find phone - look for Primary Phone or any phone field
    let phone = row["Primary Phone"] || row["Phone"] || ""
    if (!phone || !phone.match(/\d/)) {
      for (const [key, value] of Object.entries(row)) {
        if (key.endsWith("Phone") && value && value.match(/\d/)) {
          phone = value
          break
        }
      }
    }

    return {
      full_name: row["Full Name"] || "",
      first_name: row["First Name"] || "",
      last_name: row["Last Name"] || "",
      email: email || null,
      phone: phone || null,
      company: row["Company Name"] || null,
      contact_type: row["Type"] || null,
      address: row["Address"] || row["Street Address"] || null,
      city: row["City"] || null,
      state: row["State"] || null,
      zip: row["Zip"] || row["ZIP"] || row["Zip Code"] || null,
    }
  })

  // Filter out contacts without names
  const validContacts = contacts.filter(c => c.full_name || c.first_name || c.last_name)
  console.log(`${validContacts.length} valid contacts to import`)

  // Insert in batches of 100
  const batchSize = 100
  let imported = 0

  for (let i = 0; i < validContacts.length; i += batchSize) {
    const batch = validContacts.slice(i, i + batchSize)
    const { error } = await supabase.from("contacts").insert(batch)
    
    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error.message)
    } else {
      imported += batch.length
      console.log(`Imported ${imported} / ${validContacts.length} contacts`)
    }
  }

  console.log(`\nDone! Imported ${imported} contacts.`)
}

importContacts().catch(console.error)
