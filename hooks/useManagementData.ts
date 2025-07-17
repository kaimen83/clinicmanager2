import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
    MonthlyStats,
    HistoricalData,
    DoctorStats,
    DayOfWeekStats,
    DoctorRevenueStats,
    DayOfWeekRevenueStats,
    RevenueHistoricalData,
    VisitPathHistoryData,
    ConsultationStats,
    ConsultationTrendData,
    DoctorConsultationStats,
    StaffConsultationStats
} from '@/types/management-indicator';


export function useManagementData(currentDate: Date, activeTab: string, isOpen: boolean) {
    const [loading, setLoading] = useState(false);

    // 기본 통계 상태
    const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
    const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
    const [doctorStats, setDoctorStats] = useState<DoctorStats[]>([]);
    const [dayOfWeekStats, setDayOfWeekStats] = useState<DayOfWeekStats[]>([]);

    // 매출 관련 상태
    const [doctorRevenueStats, setDoctorRevenueStats] = useState<DoctorRevenueStats[]>([]);
    const [dayOfWeekRevenueStats, setDayOfWeekRevenueStats] = useState<DayOfWeekRevenueStats[]>([]);
    const [revenueHistoricalData, setRevenueHistoricalData] = useState<RevenueHistoricalData[]>([]);
    const [doctorNames, setDoctorNames] = useState<string[]>([]);

    // 내원경로 관련 상태
    const [visitPathHistoryData, setVisitPathHistoryData] = useState<any[]>([]);
    const [visitPathGroupNames, setVisitPathGroupNames] = useState<string[]>([]);

    // 상담지표 관련 상태
    const [consultationStats, setConsultationStats] = useState<ConsultationStats | null>(null);
    const [consultationTrendData, setConsultationTrendData] = useState<ConsultationTrendData[]>([]);
    const [doctorConsultationStats, setDoctorConsultationStats] = useState<DoctorConsultationStats[]>([]);
    const [staffConsultationStats, setStaffConsultationStats] = useState<StaffConsultationStats[]>([]);
    const [consultationDoctorNames, setConsultationDoctorNames] = useState<string[]>([]);

    const [allStaffs, setAllStaffs] = useState<string[]>([]);

    const fetchMonthlyStats = async () => {
        setLoading(true);
        try {
            const month = format(currentDate, 'yyyy-MM');
            const response = await fetch(`/api/stats?type=monthly&date=${month}`);
            const data = await response.json();
            if (data.stats) {
                setMonthlyStats(data.stats);
            }
        } catch (error) {
            console.error('월간 통계 조회 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistoricalData = async () => {
        try {
            const response = await fetch('/api/patient-history');
            const data = await response.json();
            if (data.history) {
                setHistoricalData(data.history);
            }
        } catch (error) {
            console.error('환자 내원 기록 조회 실패:', error);
        }
    };

    const fetchDoctorStats = async () => {
        try {
            const month = format(currentDate, 'yyyy-MM');
            const response = await fetch(`/api/doctor-stats?date=${month}`);
            const data = await response.json();
            if (data.doctorStats) {
                setDoctorStats(data.doctorStats);
            }
        } catch (error) {
            console.error('의사별 통계 조회 실패:', error);
        }
    };

    const fetchDayOfWeekStats = async () => {
        try {
            const month = format(currentDate, 'yyyy-MM');
            const response = await fetch(`/api/dayofweek-stats?date=${month}`);
            const data = await response.json();
            if (data.dayOfWeekStats) {
                setDayOfWeekStats(data.dayOfWeekStats);
            }
        } catch (error) {
            console.error('요일별 통계 조회 실패:', error);
        }
    };

    const fetchVisitPathHistoryData = async () => {
        try {
            const response = await fetch('/api/visit-path-history');
            const data = await response.json();
            if (data.visitPathHistory) {
                const groupNames = data.visitPathHistory[0]?.groups.map((group: any) => group.groupName) || [];
                setVisitPathGroupNames(groupNames);

                const transformedData = data.visitPathHistory.map((monthData: any) => {
                    const transformed: any = { month: monthData.month };
                    monthData.groups.forEach((group: any) => {
                        transformed[`${group.groupName}_환자수`] = group.patientCount;
                        transformed[`${group.groupName}_결제금액`] = group.paymentAmount;
                        transformed[`${group.groupName}_상담금액`] = group.consultationAmount;
                    });
                    return transformed;
                });
                setVisitPathHistoryData(transformedData);
            }
        } catch (error) {
            console.error('내원경로별 통계 조회 실패:', error);
        }
    };

    const fetchConsultationData = async () => {
        try {
            const month = format(currentDate, 'yyyy-MM');

            const trendResponse = await fetch('/api/consultation-trends');
            const trendData = await trendResponse.json();

            if (trendData.trends) {
                setConsultationTrendData(trendData.trends);

                const currentMonthData = trendData.trends.find((trend: any) => trend.month === month);

                if (currentMonthData) {
                    const summary = {
                        consultationAgreedAmount: currentMonthData.agreedAmount || 0,
                        consultationNonAgreedAmount: currentMonthData.nonAgreedAmount || 0,
                        totalConsultationAmount: currentMonthData.totalAmount || 0,
                        agreedCount: currentMonthData.agreedConsultations || 0,
                        nonAgreedCount: currentMonthData.nonAgreedConsultations || 0,
                        totalConsultationCount: currentMonthData.totalConsultations || 0,
                        agreedPercentage: currentMonthData.agreedPercentage || 0,
                        agreedAmountPercentage: currentMonthData.agreedAmountPercentage || 0,
                        nonAgreedAmount: currentMonthData.nonAgreedAmount || 0
                    };
                    setConsultationStats(summary);
                }
            }

            const statsResponse = await fetch(`/api/consultations/stats?type=monthly&date=${month}`);
            const statsData = await statsResponse.json();

            if (statsData.doctorStats) {
                const doctorStats = statsData.doctorStats.map((doctor: any) => ({
                    doctor: doctor.doctor,
                    totalConsultations: doctor.totalCount,
                    agreedConsultations: doctor.agreedCount,
                    nonAgreedConsultations: doctor.nonAgreedCount,
                    agreedPercentage: doctor.agreedPercentage,
                    totalAmount: doctor.totalAmount,
                    agreedAmount: doctor.agreedAmount
                }));
                setDoctorConsultationStats(doctorStats);
            }

            if (trendData.doctors) {
                setConsultationDoctorNames(trendData.doctors);
            }

            if (trendData.allStaffs) {
                setAllStaffs(trendData.allStaffs);
            }



        } catch (error) {
            console.error('상담 데이터 조회 실패:', error);
        }
    };

    const fetchRevenueData = async () => {
        try {
            const month = format(currentDate, 'yyyy-MM');

            const response = await fetch('/api/revenue-history');
            const data = await response.json();

            if (data.revenueHistory) {
                setRevenueHistoricalData(data.revenueHistory);

                if (data.revenueHistory.length > 0) {
                    const doctors = new Set<string>();

                    data.revenueHistory.forEach((monthData: any) => {
                        Object.keys(monthData).forEach(key => {
                            if (key.includes('_총매출')) {
                                const doctorName = key.replace('_총매출', '').trim();
                                if (doctorName && doctorName !== '미분류') {
                                    doctors.add(doctorName);
                                }
                            }
                        });
                    });

                    setDoctorNames(Array.from(doctors));
                }
            }

            const [year, monthNum] = month.split('-').map(Number);
            const firstDay = `${year}-${String(monthNum).padStart(2, '0')}-01`;
            const lastDay = `${year}-${String(monthNum).padStart(2, '0')}-${new Date(year, monthNum, 0).getDate().toString().padStart(2, '0')}`;

            const transactionResponse = await fetch(`/api/transactions?dateStart=${firstDay}&dateEnd=${lastDay}&limit=1000`);
            const transactionData = await transactionResponse.json();

            if (transactionData.transactions) {
                const doctorRevenueMap = new Map();
                const dayOfWeekRevenueMap = new Map();

                transactionData.transactions.forEach((transaction: any) => {
                    const doctor = transaction.doctor;
                    const amount = transaction.paymentAmount || 0;
                    const paymentMethod = transaction.paymentMethod;
                    const isConsultation = transaction.isConsultation;
                    const transactionDate = new Date(transaction.date);
                    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][transactionDate.getDay()];

                    if (!doctorRevenueMap.has(doctor)) {
                        doctorRevenueMap.set(doctor, {
                            doctor,
                            totalRevenue: 0,
                            cashRevenue: 0,
                            cardRevenue: 0,
                            consultationRevenue: 0
                        });
                    }
                    const doctorStats = doctorRevenueMap.get(doctor);
                    doctorStats.totalRevenue += amount;

                    if (paymentMethod === '현금' || paymentMethod === '계좌이체') {
                        doctorStats.cashRevenue += amount;
                    } else if (paymentMethod === '카드') {
                        doctorStats.cardRevenue += amount;
                    }

                    if (isConsultation) {
                        doctorStats.consultationRevenue += amount;
                    }

                    if (!dayOfWeekRevenueMap.has(dayOfWeek)) {
                        dayOfWeekRevenueMap.set(dayOfWeek, {
                            dayOfWeek,
                            dayNumber: transactionDate.getDay(),
                            totalRevenue: 0,
                            cashRevenue: 0,
                            cardRevenue: 0
                        });
                    }
                    const dayStats = dayOfWeekRevenueMap.get(dayOfWeek);
                    dayStats.totalRevenue += amount;

                    if (paymentMethod === '현금' || paymentMethod === '계좌이체') {
                        dayStats.cashRevenue += amount;
                    } else if (paymentMethod === '카드') {
                        dayStats.cardRevenue += amount;
                    }
                });

                const doctorRevenueArray = Array.from(doctorRevenueMap.values())
                    .sort((a, b) => b.totalRevenue - a.totalRevenue);
                setDoctorRevenueStats(doctorRevenueArray);

                const dayOrder = ['일', '월', '화', '수', '목', '금', '토'];
                const dayOfWeekRevenueArray = dayOrder.map(day =>
                    dayOfWeekRevenueMap.get(day) || {
                        dayOfWeek: day,
                        dayNumber: dayOrder.indexOf(day),
                        totalRevenue: 0,
                        cashRevenue: 0,
                        cardRevenue: 0
                    }
                );
                setDayOfWeekRevenueStats(dayOfWeekRevenueArray);
            }
        } catch (error) {
            console.error('매출 데이터 조회 실패:', error);
        }
    };

    useEffect(() => {
        if (isOpen && currentDate) {
            fetchMonthlyStats();
            fetchHistoricalData();
            fetchDoctorStats();
            fetchDayOfWeekStats();
            fetchVisitPathHistoryData();

            if (activeTab === 'revenue') {
                fetchRevenueData();
            }
            if (activeTab === 'consultation') {
                fetchConsultationData();
            }
        }
    }, [isOpen, currentDate, activeTab]);

    return {
        loading,
        monthlyStats,
        historicalData,
        doctorStats,
        dayOfWeekStats,
        doctorRevenueStats,
        dayOfWeekRevenueStats,
        revenueHistoricalData,
        doctorNames,
        visitPathHistoryData,
        visitPathGroupNames,
        consultationStats,
        consultationTrendData,
        doctorConsultationStats,
        staffConsultationStats,
        consultationDoctorNames,

        allStaffs
    };
}