"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-semibold text-black">
              Smart Report
            </Link>
            <div className="flex gap-1">
              <Link
                href="/"
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive("/")
                    ? "bg-gray-100 text-black"
                    : "text-black hover:text-black hover:bg-gray-50"
                }`}
              >
                Cargar Cartola
              </Link>
              <Link
                href="/dashboard"
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive("/dashboard")
                    ? "bg-gray-100 text-black"
                    : "text-black hover:text-black hover:bg-gray-50"
                }`}
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

