"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, FileSpreadsheet, Phone, Users, CheckCircle2, AlertCircle, Loader2, TrendingUp } from "lucide-react"

interface ImportResult {
  success: boolean
  imported?: number
  skipped?: number
  message?: string
  error?: string
}

function ImportDropzone({
  title,
  description,
  icon: Icon,
  acceptedFormats,
  onFileSelect,
  isLoading,
  result,
}: {
  title: string
  description: string
  icon: React.ElementType
  acceptedFormats: string
  onFileSelect: (file: File) => void
  isLoading: boolean
  result: ImportResult | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith(".csv")) {
      onFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  return (
    <div className="space-y-4">
      <div
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border/60 hover:border-primary/50 hover:bg-muted/30"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onFileSelect(file)
          }}
        />

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>

        <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground text-center max-w-xs">
          {description}
        </p>

        <Button
          variant="outline"
          className="mt-4"
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Select CSV File
            </>
          )}
        </Button>

        <p className="mt-3 text-xs text-muted-foreground">
          Drag and drop or click to browse. {acceptedFormats}
        </p>
      </div>

      {result && (
        <div
          className={`flex items-start gap-3 rounded-lg border p-4 ${
            result.success
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          )}
          <div className="text-sm">
            <p className="font-medium">
              {result.success ? "Import Successful" : "Import Failed"}
            </p>
            <p className="mt-0.5 opacity-90">
              {result.message || result.error}
            </p>
            {result.skipped !== undefined && result.skipped > 0 && (
              <p className="mt-1 text-xs opacity-75">
                {result.skipped} duplicate records skipped
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function DataImport() {
  const [googleAdsLoading, setGoogleAdsLoading] = useState(false)
  const [googleAdsMetricsLoading, setGoogleAdsMetricsLoading] = useState(false)
  const [hatsLoading, setHatsLoading] = useState(false)
  const [googleAdsResult, setGoogleAdsResult] = useState<ImportResult | null>(null)
  const [googleAdsMetricsResult, setGoogleAdsMetricsResult] = useState<ImportResult | null>(null)
  const [hatsResult, setHatsResult] = useState<ImportResult | null>(null)

  const handleGoogleAdsImport = async (file: File) => {
    setGoogleAdsLoading(true)
    setGoogleAdsResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/import/google-ads-calls", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setGoogleAdsResult({
          success: true,
          imported: data.imported,
          skipped: data.skipped,
          message: data.message + (data.failed > 0 ? ` (${data.failed} failed - check format)` : ""),
        })
      } else {
        setGoogleAdsResult({
          success: false,
          error: data.details ? `${data.error}: ${data.details}` : (data.error || "Failed to import file"),
        })
      }
    } catch (error) {
      console.error("[v0] Google Ads upload error:", error)
      setGoogleAdsResult({
        success: false,
        error: `Failed to upload file: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setGoogleAdsLoading(false)
    }
  }

  const handleGoogleAdsMetricsImport = async (file: File) => {
    setGoogleAdsMetricsLoading(true)
    setGoogleAdsMetricsResult(null)

    try {
      const text = await file.text()

      const response = await fetch("/api/import-google-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvData: text }),
      })

      const data = await response.json()

      if (response.ok) {
        setGoogleAdsMetricsResult({
          success: true,
          imported: data.imported,
          message: `Imported ${data.imported} rows (${data.dateRange.from} to ${data.dateRange.to})`,
        })
      } else {
        setGoogleAdsMetricsResult({
          success: false,
          error: data.error || "Failed to import file",
        })
      }
    } catch (error) {
      setGoogleAdsMetricsResult({
        success: false,
        error: `Failed to upload file: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setGoogleAdsMetricsLoading(false)
    }
  }

  const handle17HatsImport = async (file: File) => {
    setHatsLoading(true)
    setHatsResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/import/17hats-contacts", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setHatsResult({
          success: true,
          imported: data.imported,
          skipped: data.skipped,
          message: data.message,
        })
      } else {
        setHatsResult({
          success: false,
          error: data.details ? `${data.error}: ${data.details}` : (data.error || "Failed to import file"),
        })
      }
    } catch (error) {
      console.error("[v0] 17hats upload error:", error)
      setHatsResult({
        success: false,
        error: `Failed to upload file: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setHatsLoading(false)
    }
  }

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">
              Import Data
            </CardTitle>
            <CardDescription className="mt-1">
              Upload CSV exports from Google Ads and 17hats
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            <FileSpreadsheet className="mr-1 h-3 w-3" />
            CSV Import
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="google-ads-metrics" className="w-full">
          <TabsList className="flex !w-full mb-6 h-auto p-1">
            <TabsTrigger value="google-ads-metrics" className="flex-1 gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Google Ads</span> Metrics
            </TabsTrigger>
            <TabsTrigger value="google-ads" className="flex-1 gap-2">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Google Ads</span> Calls
            </TabsTrigger>
            <TabsTrigger value="17hats" className="flex-1 gap-2">
              <Users className="h-4 w-4" />
              17hats <span className="hidden sm:inline">Contacts</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="google-ads-metrics" className="mt-4">
            <ImportDropzone
              title="Google Ads Campaign Metrics"
              description="Export from Google Ads: Reports > Campaigns > Download CSV. Include Date, Campaign, Cost, Clicks, Impressions, and Conversions columns."
              icon={TrendingUp}
              acceptedFormats="CSV format only"
              onFileSelect={handleGoogleAdsMetricsImport}
              isLoading={googleAdsMetricsLoading}
              result={googleAdsMetricsResult}
            />
          </TabsContent>

          <TabsContent value="google-ads" className="mt-4">
            <ImportDropzone
              title="Google Ads Call Details"
              description="Export from Google Ads: Reports > Call Details > Download CSV. Includes phone numbers, duration, campaign, and call status."
              icon={Phone}
              acceptedFormats="CSV format only"
              onFileSelect={handleGoogleAdsImport}
              isLoading={googleAdsLoading}
              result={googleAdsResult}
            />
          </TabsContent>

          <TabsContent value="17hats" className="mt-4">
            <ImportDropzone
              title="17hats Contacts"
              description="Export from 17hats: Contacts > Export to CSV. Includes name, email, phone, lead source, and contact details."
              icon={Users}
              acceptedFormats="CSV format only"
              onFileSelect={handle17HatsImport}
              isLoading={hatsLoading}
              result={hatsResult}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
