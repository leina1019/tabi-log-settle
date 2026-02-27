import { useState, useMemo, useEffect } from 'react';

export const useTripDates = (tripStartDate: string, tripEndDate: string) => {
    const [selectedDate, setSelectedDate] = useState<string>('');

    const dateRange = useMemo(() => {
        if (!tripStartDate) return [];
        const dates: string[] = [];
        const start = new Date(tripStartDate);
        const end = tripEndDate ? new Date(tripEndDate) : new Date(tripStartDate);
        let current = new Date(start);
        let count = 0;
        while (current <= end && count < 31) {
            dates.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
            count++;
        }
        return dates;
    }, [tripStartDate, tripEndDate]);

    useEffect(() => {
        if (dateRange.length > 0 && !selectedDate) {
            setSelectedDate(dateRange[0]);
        } else if (dateRange.length === 0 && !selectedDate) {
            setSelectedDate(new Date().toISOString().split('T')[0]);
        }
    }, [dateRange, selectedDate]);

    const getDayLabel = (dateStr: string, index: number) => {
        const d = new Date(dateStr);
        const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
        return {
            day: `${index + 1}日目`,
            date: `${d.getDate()}`,
            week: weekDays[d.getDay()],
        };
    };

    const isTodayDate = (dateStr: string) => {
        if (!dateStr) return false;
        const today = new Date().toISOString().split('T')[0];
        return dateStr === today;
    };

    return {
        selectedDate,
        setSelectedDate,
        dateRange,
        getDayLabel,
        isTodayDate,
    };
};
