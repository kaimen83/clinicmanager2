'use client';

import { useState, useEffect } from 'react';
import { Patient } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

// 샘플 데이터
const SAMPLE_PATIENTS: Patient[] = [
  { id: 1, chartNumber: 'CH001', name: '김민수', treatment: '충치 치료', amount: 55000, paymentMethod: '현금', doctor: '김지훈' },
  { id: 2, chartNumber: 'CH002', name: '이지연', treatment: '스케일링', amount: 80000, paymentMethod: '카드', doctor: '김지훈' },
  { id: 3, chartNumber: 'CH003', name: '박준호', treatment: '임플란트 상담', amount: 30000, paymentMethod: '계좌이체', doctor: '김지훈' },
  { id: 4, chartNumber: 'CH004', name: '정미영', treatment: '치아 교정', amount: 150000, paymentMethod: '카드', doctor: '이수진' },
  { id: 5, chartNumber: 'CH005', name: '윤서진', treatment: '구강 검진', amount: 40000, paymentMethod: '현금', doctor: '이수진' },
  { id: 6, chartNumber: 'CH006', name: '최준석', treatment: '사랑니 발치', amount: 120000, paymentMethod: '카드', doctor: '박세준' },
  { id: 7, chartNumber: 'CH007', name: '한지민', treatment: '신경 치료', amount: 95000, paymentMethod: '카드', doctor: '박세준' },
];

// 의사별로 환자 목록 그룹화 함수
const groupPatientsByDoctor = (patients: Patient[]) => {
  const grouped: Record<string, Patient[]> = {};
  
  patients.forEach(patient => {
    if (!grouped[patient.doctor]) {
      grouped[patient.doctor] = [];
    }
    grouped[patient.doctor].push(patient);
  });
  
  return grouped;
};

type Props = {
  date: Date;
  patients?: Patient[];
};

export default function PatientList({ date, patients = SAMPLE_PATIENTS }: Props) {
  const [expandedDoctors, setExpandedDoctors] = useState<Record<string, boolean>>({});
  const groupedPatients = groupPatientsByDoctor(patients);
  const doctorNames = Object.keys(groupedPatients);
  
  // 초기 상태는 모든 의사의 목록이 펼쳐져 있음
  useEffect(() => {
    const initialExpandedState: Record<string, boolean> = {};
    doctorNames.forEach(doctor => {
      initialExpandedState[doctor] = true;
    });
    setExpandedDoctors(initialExpandedState);
  }, [patients]);
  
  const toggleDoctorExpand = (doctor: string) => {
    setExpandedDoctors(prev => ({
      ...prev,
      [doctor]: !prev[doctor]
    }));
  };
  
  const handleEditPatient = (patient: Patient) => {
    // 환자 정보 수정 로직
    console.log('수정:', patient);
  };
  
  const handleDeletePatient = (patient: Patient) => {
    // 환자 정보 삭제 로직
    console.log('삭제:', patient);
    if (confirm(`${patient.name} 환자의 정보를 삭제하시겠습니까?`)) {
      // 실제 삭제 로직 구현
    }
  };
  
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };
  
  return (
    <Card className="w-full h-full shadow-sm">
      <CardHeader>
        <CardTitle>진료 환자 목록</CardTitle>
        <CardDescription>
          {date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}의 진료 내역
        </CardDescription>
      </CardHeader>
      <CardContent className="max-h-[calc(100vh-300px)] overflow-auto p-0">
        {doctorNames.map(doctor => (
          <div key={doctor} className="mb-4">
            <div 
              className="bg-gray-100 p-3 flex justify-between items-center cursor-pointer"
              onClick={() => toggleDoctorExpand(doctor)}
            >
              <h3 className="font-medium">{doctor} 의사 ({groupedPatients[doctor].length}명)</h3>
              {expandedDoctors[doctor] ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </div>
            
            {expandedDoctors[doctor] && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">번호</TableHead>
                      <TableHead>차트번호</TableHead>
                      <TableHead>환자성명</TableHead>
                      <TableHead>진료내용</TableHead>
                      <TableHead className="text-right">수납금액</TableHead>
                      <TableHead>수납방법</TableHead>
                      <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedPatients[doctor].map((patient, index) => (
                      <TableRow key={patient.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{patient.chartNumber}</TableCell>
                        <TableCell>{patient.name}</TableCell>
                        <TableCell>{patient.treatment}</TableCell>
                        <TableCell className="text-right">{formatAmount(patient.amount)}원</TableCell>
                        <TableCell>{patient.paymentMethod}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditPatient(patient)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeletePatient(patient)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
} 