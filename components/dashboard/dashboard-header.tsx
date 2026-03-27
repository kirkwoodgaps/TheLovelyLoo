import Image from "next/image"

export function DashboardHeader() {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Image
            src="/images/logo-main.png"
            alt="The Lovely Loo"
            width={180}
            height={50}
            className="w-[140px] sm:w-[180px]"
            style={{ width: "auto", height: "auto" }}
            priority
          />
          <div className="h-8 w-px bg-border/60 hidden sm:block" />
          <p className="text-sm text-muted-foreground hidden sm:block">
            Leads & Ad Spend Dashboard
          </p>
        </div>
      </div>
    </header>
  )
}
