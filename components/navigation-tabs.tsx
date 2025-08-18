"use client"
import { Button } from "@/components/ui/button"
import { Calendar, CheckSquare } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"

export default function NavigationTabs() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true
    if (path === "/my-tasks" && pathname === "/my-tasks") return true
    return false
  }

  return (
    <div className="border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          <Link href="/">
            <Button
              variant={isActive("/") ? "default" : "ghost"}
              className={`rounded-none border-b-2 ${
                isActive("/")
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-transparent hover:border-muted-foreground"
              }`}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Link href="/my-tasks">
            <Button
              variant={isActive("/my-tasks") ? "default" : "ghost"}
              className={`rounded-none border-b-2 ${
                isActive("/my-tasks")
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-transparent hover:border-muted-foreground"
              }`}
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              My Tasks
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
