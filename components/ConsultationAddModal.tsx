'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { toISODateString, getCurrentKstDate } from '@/lib/utils';

interface ConsultationAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  chartNumber: string;
  patientName: string;
  onSuccess: () => void;
}

interface Settings {
  doctor: Array<{ value: string }>;
  staff: Array<{ value: string }>;
}

export default function ConsultationAddModal({
  isOpen,
  onClose,
  chartNumber,
  patientName,
  onSuccess
}: ConsultationAddModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    date: toISODateString(getCurrentKstDate()),
    chartNumber: chartNumber,
    patientName: patientName,
    doctor: '',
    staff: '',
    amount: '',
    agreed: false,
    notes: ''
  });
  const [settings, setSettings] = useState<Settings>({ doctor: [], staff: [] });
  const [loading, setLoading] = useState(false);

  // 설정 로드
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  // 차트번호와 환자명이 변경되면 폼 데이터 업데이트
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      chartNumber,
      patientName
    }));
  }, [chartNumber, patientName]);

  const loadSettings = async () => {
    try {
      // 의사 데이터 가져오기
      const doctorResponse = await fetch('/api/settings?type=doctor');
      let doctorData = [];
      if (doctorResponse.ok) {
        const data = await doctorResponse.json();
        doctorData = data.settings || [];
      }

      // 직원 데이터 가져오기
      const staffResponse = await fetch('/api/settings?type=staff');
      let staffData = [];
      if (staffResponse.ok) {
        const data = await staffResponse.json();
        staffData = data.settings || [];
      }

      setSettings({
        doctor: doctorData,
        staff: staffData
      });
    } catch (error) {
      console.error('설정 로드 중 오류:', error);
      toast({
        title: "오류",
        description: "설정을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!chartNumber || !patientName) {
      toast({
        title: "오류",
        description: "차트번호와 환자 이름을 먼저 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.doctor || !formData.staff || !formData.amount) {
      toast({
        title: "오류",
        description: "모든 필수 항목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const consultationData = {
        date: formData.date,
        chartNumber: formData.chartNumber,
        patientName: formData.patientName,
        doctor: formData.doctor,
        staff: formData.staff,
        amount: Number(formData.amount),
        agreed: formData.agreed,
        notes: formData.notes || '',
        confirmedDate: formData.agreed ? new Date().toISOString() : null
      };

      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(consultationData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '상담 정보 저장에 실패했습니다.');
      }

      toast({
        title: "성공",
        description: "상담 정보가 저장되었습니다.",
      });
      onSuccess();
      onClose();
      
      // 폼 초기화
      setFormData({
        date: toISODateString(getCurrentKstDate()),
        chartNumber: chartNumber,
        patientName: patientName,
        doctor: '',
        staff: '',
        amount: '',
        agreed: false,
        notes: ''
      });

    } catch (error: any) {
      console.error('상담 정보 저장 중 오류:', error);
      toast({
        title: "오류",
        description: error.message || "상담 정보 저장에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">상담 정보 입력</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="consultation-date" className="text-sm font-medium text-gray-700">
                상담날짜
              </label>
              <input
                type="date"
                id="consultation-date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
                className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 차트번호와 환자명 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="chartNumber" className="block text-sm font-medium text-gray-700 mb-2">
                차트번호
              </label>
              <input
                type="text"
                id="chartNumber"
                name="chartNumber"
                value={formData.chartNumber}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="patientName" className="block text-sm font-medium text-gray-700 mb-2">
                환자명
              </label>
              <input
                type="text"
                id="patientName"
                name="patientName"
                value={formData.patientName}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none"
              />
            </div>
          </div>

          {/* 담당의사와 상담직원 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="doctor" className="block text-sm font-medium text-gray-700 mb-2">
                담당의사 <span className="text-red-500">*</span>
              </label>
              <select
                id="doctor"
                name="doctor"
                value={formData.doctor}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택하세요</option>
                {settings.doctor.map((doctor, index) => (
                  <option key={index} value={doctor.value}>
                    {doctor.value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="staff" className="block text-sm font-medium text-gray-700 mb-2">
                상담직원 <span className="text-red-500">*</span>
              </label>
              <select
                id="staff"
                name="staff"
                value={formData.staff}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택하세요</option>
                {settings.staff.map((staff, index) => (
                  <option key={index} value={staff.value}>
                    {staff.value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 상담금액과 동의여부 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                상담금액 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                required
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="금액을 입력하세요"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                동의여부
              </label>
              <div className="flex items-center h-10">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="agreed"
                    checked={formData.agreed}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">동의</span>
                </label>
              </div>
            </div>
          </div>

          {/* 비고 */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              비고
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="추가 메모를 입력하세요"
            />
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 