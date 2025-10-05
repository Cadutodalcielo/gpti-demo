"use client";

import { useState } from "react";
import PDFUploader from "@/components/PDFUploader";
import Navigation from "@/components/Navigation";

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    // Trigger refresh
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-black mb-2">
            Cargar Cartola Bancaria
          </h1>
          <p className="text-black">
            Sube tu cartola en formato PDF para analizar todas las transacciones automáticamente
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <PDFUploader onUploadSuccess={handleUploadSuccess} />
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-100 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-black mb-2">
            Información
          </h3>
          <ul className="text-sm text-black space-y-1">
            <li>• El sistema procesará todas las transacciones de tu cartola</li>
            <li>• Se clasificarán automáticamente por categoría</li>
            <li>• Los resultados estarán disponibles en el Dashboard</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
