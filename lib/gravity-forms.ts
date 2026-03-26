const BASE_URL = "https://thelovelyloo.com/wp-json/gf/v2"

async function gfFetch<T>(path: string): Promise<T> {
  const ck = process.env.GRAVITY_FORMS_CONSUMER_KEY
  const cs = process.env.GRAVITY_FORMS_CONSUMER_SECRET

  if (!ck || !cs) {
    throw new Error("Missing Gravity Forms API credentials")
  }

  const authHeader = `Basic ${Buffer.from(`${ck}:${cs}`).toString("base64")}`
  const url = `${BASE_URL}${path}`

  const res = await fetch(url, {
    headers: { Authorization: authHeader },
    next: { revalidate: 300 },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`GF API error: ${res.status} for ${path} - ${body.substring(0, 200)}`)
  }
  return res.json()
}

// ── Types ──────────────────────────────────────────────

export interface GFForm {
  id: string
  title: string
  entries: string
}

export interface GFEntry {
  id: string
  form_id: string
  date_created: string
  date_updated: string
  source_url: string
  status: string
  is_read: string
  is_starred: string
  // Dynamic field IDs
  [key: string]: string | null
}

interface GFEntriesResponse {
  total_count: string
  entries: GFEntry[]
}

// ── Field mappings per form ────────────────────────────

// Form 1 (Contact): 1=Name, 2=Email, 3=Message
// Form 2 (Quote): 1=Name, 2=Email, 3=Phone, 4=Event Start Date, 7=Event Address, 8=Your Title, 6=Additional Info
// Form 3 (New Quote): 1=Name, 2=Email, 3=Phone, 12=Event Date, 14=Event Location, 6=Additional Info
// Form 4 (New Quote Popup): 1=Name, 2=Email, 3=Phone, 12=Event Date, 14=Event Location, 6=Additional Info

function normalizeEntry(entry: GFEntry) {
  const formId = entry.form_id

  let name = ""
  let email = ""
  let phone = ""
  let eventDate = ""
  let location = ""
  let details = ""
  let formName = ""

  if (formId === "1") {
    formName = "Contact"
    name = entry["1"] || ""
    email = entry["2"] || ""
    details = entry["3"] || ""
  } else if (formId === "2") {
    formName = "Quote"
    name = entry["1"] || ""
    email = entry["2"] || ""
    phone = entry["3"] || ""
    eventDate = entry["4"] || ""
    location = entry["7.1"] || entry["7"] || ""
    details = entry["6"] || ""
  } else if (formId === "3") {
    formName = "New Quote"
    name = entry["1"] || ""
    email = entry["2"] || ""
    phone = entry["3"] || ""
    eventDate = entry["12"] || ""
    location = entry["14"] || ""
    details = entry["6"] || ""
  } else if (formId === "4") {
    formName = "New Quote Popup"
    name = entry["1"] || ""
    email = entry["2"] || ""
    phone = entry["3"] || ""
    eventDate = entry["12"] || ""
    location = entry["14"] || ""
    details = entry["6"] || ""
  }

  return {
    id: entry.id,
    formId,
    formName,
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    eventDate: eventDate.trim(),
    location: location.trim(),
    details: details.trim(),
    sourceUrl: entry.source_url || "",
    status: entry.is_read === "1" ? "Read" : "New",
    isStarred: entry.is_starred === "1",
    dateCreated: entry.date_created,
    rawStatus: entry.status,
  }
}

export type NormalizedEntry = ReturnType<typeof normalizeEntry>

// ── Public API ─────────────────────────────────────────

export async function getForms(): Promise<Record<string, GFForm>> {
  return gfFetch<Record<string, GFForm>>("/forms")
}

export async function getFormEntries(
  formId: number,
  pageSize = 20,
  page = 1
): Promise<GFEntriesResponse> {
  return gfFetch<GFEntriesResponse>(
    `/forms/${formId}/entries?paging[page_size]=${pageSize}&paging[current_page]=${page}&sorting[key]=date_created&sorting[direction]=DESC`
  )
}

export async function getAllEntries(
  pageSize = 20,
  page = 1
): Promise<GFEntriesResponse> {
  return gfFetch<GFEntriesResponse>(
    `/entries?paging[page_size]=${pageSize}&paging[current_page]=${page}&sorting[key]=date_created&sorting[direction]=DESC`
  )
}

export async function getEntriesForDateRange(
  startDate: string,
  endDate: string,
  pageSize = 200
): Promise<GFEntriesResponse> {
  // Gravity Forms search criteria
  const search = encodeURIComponent(
    JSON.stringify({
      field_filters: [
        { key: "date_created", value: startDate, operator: ">=" },
        { key: "date_created", value: endDate, operator: "<=" },
      ],
    })
  )
  return gfFetch<GFEntriesResponse>(
    `/entries?search=${search}&paging[page_size]=${pageSize}&sorting[key]=date_created&sorting[direction]=DESC`
  )
}

// Fetch all entries across multiple pages for a date range
export async function getAllEntriesForDateRange(
  startDate: string,
  endDate: string
): Promise<NormalizedEntry[]> {
  const pageSize = 200
  let page = 1
  let allEntries: NormalizedEntry[] = []
  let totalCount = 0

  do {
    const search = encodeURIComponent(
      JSON.stringify({
        field_filters: [
          { key: "date_created", value: startDate, operator: ">=" },
          { key: "date_created", value: endDate, operator: "<=" },
        ],
      })
    )
    const res = await gfFetch<GFEntriesResponse>(
      `/entries?search=${search}&paging[page_size]=${pageSize}&paging[current_page]=${page}&sorting[key]=date_created&sorting[direction]=DESC`
    )
    totalCount = parseInt(res.total_count, 10)
    const normalized = (res.entries || [])
      .filter((e) => e.status === "active")
      .map(normalizeEntry)
    allEntries = allEntries.concat(normalized)
    page++
  } while (allEntries.length < totalCount && page <= 50) // Safety cap at 50 pages

  return allEntries
}

export async function getRecentEntries(count = 25): Promise<NormalizedEntry[]> {
  const res = await getAllEntries(count, 1)
  return (res.entries || [])
    .filter((e) => e.status === "active")
    .map(normalizeEntry)
}

// ── Dashboard aggregation ──────────────────────────────

export interface DashboardData {
  forms: { id: string; title: string; totalEntries: number }[]
  totalLeads: number
  recentLeads: NormalizedEntry[]
  monthlyData: {
    month: string
    year: number
    contact: number
    quote: number
    newQuote: number
    popup: number
    total: number
  }[]
  weeklyData: { day: string; leads: number }[]
  formBreakdown: { name: string; value: number }[]
  currentMonthLeads: number
  previousMonthLeads: number
}

export async function getDashboardData(): Promise<DashboardData> {
  // Get form metadata
  const formsRaw = await getForms()
  const forms = Object.values(formsRaw).map((f) => ({
    id: f.id,
    title: f.title,
    totalEntries: parseInt(f.entries, 10),
  }))

  const totalLeads = forms.reduce((sum, f) => sum + f.totalEntries, 0)

  // Get recent entries for the table
  const recentLeads = await getRecentEntries(25)

  // Get entries for the last 6 months for charts
  const now = new Date()
  const sixMonthsAgo = new Date(now)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  sixMonthsAgo.setDate(1)
  sixMonthsAgo.setHours(0, 0, 0, 0)

  const startDate = sixMonthsAgo.toISOString().split("T")[0] + " 00:00:00"
  const endDate = now.toISOString().split("T")[0] + " 23:59:59"

  const rangeEntries = await getAllEntriesForDateRange(startDate, endDate)

  // Group by month for monthly chart (using YYYY-MM as key for proper sorting/filtering)
  const monthlyMap = new Map<
    string,
    { contact: number; quote: number; newQuote: number; popup: number; total: number; year: number }
  >()

  // Initialize all 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now)
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    monthlyMap.set(key, { contact: 0, quote: 0, newQuote: 0, popup: 0, total: 0, year: d.getFullYear() })
  }

  for (const entry of rangeEntries) {
    const d = new Date(entry.dateCreated)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const bucket = monthlyMap.get(monthKey)
    if (bucket) {
      bucket.total++
      if (entry.formId === "1") bucket.contact++
      else if (entry.formId === "2") bucket.quote++
      else if (entry.formId === "3") bucket.newQuote++
      else if (entry.formId === "4") bucket.popup++
    }
  }

  const monthlyData = Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    ...data,
  }))

  // Weekly data (last 7 days)
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const weeklyMap = new Map<string, number>()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    weeklyMap.set(dayNames[d.getDay()], 0)
  }

  for (const entry of rangeEntries) {
    const d = new Date(entry.dateCreated)
    const daysDiff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff < 7) {
      const dayName = dayNames[d.getDay()]
      weeklyMap.set(dayName, (weeklyMap.get(dayName) || 0) + 1)
    }
  }

  const weeklyData = Array.from(weeklyMap.entries()).map(([day, leads]) => ({
    day,
    leads,
  }))

  // Form breakdown for pie chart
  const formBreakdown = forms.map((f) => ({
    name: f.title,
    value: f.totalEntries,
  }))

  // Current vs previous month counts
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const currentMonthLeads = rangeEntries.filter((e) => {
    const d = new Date(e.dateCreated)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  }).length

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
  const previousMonthLeads = rangeEntries.filter((e) => {
    const d = new Date(e.dateCreated)
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear
  }).length

  return {
    forms,
    totalLeads,
    recentLeads,
    monthlyData,
    weeklyData,
    formBreakdown,
    currentMonthLeads,
    previousMonthLeads,
  }
}
