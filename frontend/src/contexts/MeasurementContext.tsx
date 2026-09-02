import { createContext, useContext, useEffect, useState } from 'react';
import { getPublicSettings } from '../services/api';

type MeasurementUnit = 'ft' | 'cm';
type MeasurementContextValue = { sizeUnit: MeasurementUnit; setSizeUnit: (unit: string) => void };

const MeasurementContext = createContext<MeasurementContextValue | null>(null);
const STORAGE_KEY = 'dreamrugs_measurement_unit';

export function MeasurementProvider({ children }: { children: React.ReactNode }) {
  const [sizeUnit, setUnit] = useState<MeasurementUnit>(() => localStorage.getItem(STORAGE_KEY) === 'cm' ? 'cm' : 'ft');

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    getPublicSettings().then((settings) => setUnit(settings.default_size_unit === 'cm' ? 'cm' : 'ft')).catch(() => {});
  }, []);

  const setSizeUnit = (unit: string) => {
    const normalized: MeasurementUnit = unit === 'cm' ? 'cm' : 'ft';
    localStorage.setItem(STORAGE_KEY, normalized);
    setUnit(normalized);
  };
  return <MeasurementContext.Provider value={{ sizeUnit, setSizeUnit }}>{children}</MeasurementContext.Provider>;
}

export function useMeasurementUnit() {
  const value = useContext(MeasurementContext);
  if (!value) throw new Error('useMeasurementUnit must be used within MeasurementProvider');
  return value;
}
