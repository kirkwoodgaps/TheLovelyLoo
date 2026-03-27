import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// Allow larger file uploads (up to 10MB) - App Router uses route segment config
export const maxDuration = 60
export const dynamic = 'force-dynamic'

interface ContactRecord {
  first_name: string
  last_name: string
  email: string
  phone: string
  company: string | null
  lead_source: string | null
  status: string | null
  tags: string | null
  notes: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  created_date: string | null
}

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n")
  if (lines.length < 2) return []

  // 17hats exports use tabs as delimiters
  const delimiter = lines[0].includes("\t") ? "\t" : ","
  
  const headers = delimiter === "\t" 
    ? lines[0].split("\t").map((h) => h.trim().replace(/^"|"$/g, ""))
    : lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))
  
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const values = delimiter === "\t"
      ? line.split("\t").map(v => v.trim())
      : parseCSVLine(line)
    
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim().replace(/^"|"$/g, "") || ""
    })
    rows.push(row)
  }

  return rows
}

function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      values.push(current)
      current = ""
    } else {
      current += char
    }
  }
  values.push(current)

  return values
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null
  
  try {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      return d.toISOString()
    }
  } catch {
    return null
  }
  
  return null
}

export async function POST(request: NextRequest) {
  try {
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (formError) {
      return NextResponse.json(
        { error: "Failed to read form data. File may be too large (max 4MB).", details: String(formError) },
        { status: 413 }
      )
    }
    
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    
    // Check file size (4MB limit for Vercel)
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 4MB.` },
        { status: 413 }
      )
    }

    const csvText = await file.text()
    const rows = parseCSV(csvText)

    if (rows.length === 0) {
      return NextResponse.json({ error: "No data found in CSV" }, { status: 400 })
    }

    // Map CSV columns to database columns
    // 17hats export has: Full Name, First Name, Last Name, Company Name, Type, Email, and many phone columns
    // Phone columns are named after contacts (e.g., "Brenda Phone", "Rich Phone")
    // We need to find any non-empty email and phone values
    const records: ContactRecord[] = rows.map((row) => {
      // Find the first non-empty email (17hats has many email columns)
      let email = row["Email"] || ""
      if (!email) {
        // Look for "Primary Email" or any column ending with "Email" that has a value
        for (const [key, value] of Object.entries(row)) {
          if (key.toLowerCase().includes("email") && value && value.includes("@")) {
            email = value
            break
          }
        }
      }
      
      // Find the first non-empty phone (17hats has many phone columns)
      let phone = row["Phone"] || ""
      if (!phone) {
        // Look for any column ending with "Phone" that has a value
        for (const [key, value] of Object.entries(row)) {
          if (key.toLowerCase().includes("phone") && value && value.match(/\d/)) {
            phone = value
            break
          }
        }
      }
      
      return {
        first_name:
          row["First Name"] || row["First name"] || row["first_name"] || row["FirstName"] || "",
        last_name:
          row["Last Name"] || row["Last name"] || row["last_name"] || row["LastName"] || "",
        email,
        phone,
        company:
          row["Company Name"] || row["Company"] || row["company"] || row["Business"] || null,
        lead_source:
          row["Lead Source"] || row["Source"] || row["lead_source"] || row["Referral Source"] || null,
        status:
          row["Type"] || row["Status"] || row["status"] || row["Contact Status"] || null,
        tags:
          row["Tags"] || row["tags"] || row["Categories"] || null,
        notes:
          row["Notes"] || row["notes"] || row["Comments"] || row["Description"] || null,
        address:
          row["Address"] || row["address"] || row["Street"] || row["Street Address"] || null,
        city:
          row["City"] || row["city"] || null,
        state:
          row["State"] || row["state"] || row["Province"] || null,
        zip:
          row["Zip"] || row["zip"] || row["ZIP"] || row["Postal Code"] || row["Zip Code"] || null,
        created_date: parseDate(
          row["Created Date"] || row["Created"] || row["Date Created"] || row["created_date"] || ""
        ),
      }
    })

    // Filter out records without email or phone
    const validRecords = records.filter((r) => r.email || r.phone)

    if (validRecords.length === 0) {
      return NextResponse.json(
        { error: "No valid records found (need email or phone)" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("contacts_17hats")
      .insert(validRecords)
      .select()

    if (error) {
      return NextResponse.json(
        { error: "Failed to import records", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      imported: data?.length || validRecords.length,
      skipped: records.length - validRecords.length,
      message: `Successfully imported ${data?.length || validRecords.length} contacts`,
    })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json(
      { error: "Failed to process CSV file", details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("contacts_17hats")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ contacts: data })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
