'use client';

import { ReactNode } from 'react';
import { useDateContext } from '@/lib/context/dateContext';
import PatientList from '@/components/PatientList';
import ClinicStats from '@/components/ClinicStats';
import ExtraIncomeList from '@/components/ExtraIncomeList';
import { Card } from '@/components/ui/card';

type Props = {
  children?: ReactNode;
};

export default function DashboardContent({ children }: Props) {
  const { selectedDate } = useDateContext();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <PatientList date={selectedDate} />
      </div>
      <div className="lg:col-span-1 space-y-4">
        <Card className="shadow-sm p-4 bg-slate-50">
          <div className="space-y-4">
            <ClinicStats date={selectedDate} />
            <ExtraIncomeList date={selectedDate} />
          </div>
        </Card>
      </div>
    </div>
  );
} 