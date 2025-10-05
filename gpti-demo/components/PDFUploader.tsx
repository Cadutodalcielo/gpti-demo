"use client";

import { useState, useCallback } from "react";
import { uploadPDF } from "@/lib/api";

interface PDFUploaderProps {
  onUploadSuccess: () => void;
}

export default function PDFUploader({ onUploadSuccess }: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setError(null);

      const files = Array.from(e.dataTransfer.files);
      const pdfFile = files.find((file) => file.type === "application/pdf");

      if (!pdfFile) {
        setError("Por favor, sube un archivo PDF");
        return;
      }

      await handleUpload(pdfFile);
    },
    []
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const file = e.target.files?.[0];

      if (!file) return;

      if (file.type !== "application/pdf") {
        setError("Por favor, sube un archivo PDF");
        return;
      }

      await handleUpload(file);
    },
    []
  );

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await uploadPDF(file);
      setSuccessMessage(`${result.count} transacciones procesadas correctamente`);
      setTimeout(() => {
        onUploadSuccess();
        setSuccessMessage(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir el archivo");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all
          ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white"}
          ${isUploading ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-blue-400"}
        `}
      >
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        
        <div className="space-y-4">
          <svg
            className="mx-auto h-12 w-12 text-black"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          
          <div className="text-black">
            {isUploading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Analizando PDF...</span>
              </div>
            ) : (
              <>
                <p className="text-lg font-medium text-black">
                  Arrastra y suelta tu PDF aquí
                </p>
                <p className="text-sm text-black mt-1">
                  o haz clic para seleccionar un archivo
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
