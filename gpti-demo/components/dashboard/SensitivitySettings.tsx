"use client";

import { useState, useEffect } from "react";

type SensitivityLevel = "conservative" | "standard" | "strict";

interface SensitivitySettingsProps {
  onSensitivityChange?: (level: SensitivityLevel) => void;
}

export default function SensitivitySettings({ onSensitivityChange }: SensitivitySettingsProps) {
  const [sensitivity, setSensitivity] = useState<SensitivityLevel>("standard");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Cargar sensibilidad guardada (por ahora desde localStorage)
    const saved = localStorage.getItem("suspicion_sensitivity") as SensitivityLevel;
    if (saved && ["conservative", "standard", "strict"].includes(saved)) {
      setSensitivity(saved);
    }
  }, []);

  const handleChange = async (newSensitivity: SensitivityLevel) => {
    setSaving(true);
    try {
      // Guardar en localStorage por ahora
      localStorage.setItem("suspicion_sensitivity", newSensitivity);
      
      // Llamar al backend
      try {
        const { setSensitivity } = await import("@/lib/api");
        await setSensitivity(newSensitivity);
      } catch (err) {
        console.warn("No se pudo guardar en backend, usando localStorage");
      }
      
      setSensitivity(newSensitivity);
      onSensitivityChange?.(newSensitivity);
    } catch (error) {
      console.error("Error guardando sensibilidad:", error);
    } finally {
      setSaving(false);
    }
  };

  const sensitivityInfo = {
    conservative: {
      label: "Conservador",
      description: "Solo alerta sobre movimientos muy inusuales",
      threshold: "70%",
    },
    standard: {
      label: "Estándar",
      description: "Balance entre detección y falsos positivos",
      threshold: "50%",
    },
    strict: {
      label: "Estricto",
      description: "Alerta sobre cualquier movimiento inusual",
      threshold: "30%",
    },
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-black mb-1">
            Sensibilidad de Alertas
          </h3>
          <p className="text-xs text-gray-600">
            {sensitivityInfo[sensitivity].description}
          </p>
        </div>
        <div className="flex gap-2">
          {(["conservative", "standard", "strict"] as SensitivityLevel[]).map((level) => {
            const info = sensitivityInfo[level];
            const isActive = sensitivity === level;
            return (
              <button
                key={level}
                onClick={() => handleChange(level)}
                disabled={saving}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  isActive
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                } disabled:opacity-50`}
                title={`Umbral: ${info.threshold}`}
              >
                {info.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

