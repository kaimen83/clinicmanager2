'use client';

import { ReactNode } from 'react';
import { useDateContext } from '@/lib/context/dateContext';
import PatientList from '@/components/PatientList';
import ClinicStats from '@/components/ClinicStats';

type Props = {
  children?: ReactNode;
};

export default function DashboardContent({ children }: Props) {
  const { selectedDate } = useDateContext();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <PatientList date={selectedDate} />
      </div>
      <div className="lg:col-span-1">
        <ClinicStats date={selectedDate} />
      </div>
    </div>
  );
} 