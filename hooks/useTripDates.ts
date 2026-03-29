import { useState, useMemo, useEffect } from 'react';
import { getLocalDateString } from '../utils/dateUtils';
import { useTranslation } from '../contexts/LanguageContext';

export const useTripDates = (tripStartDate: string, tripEndDate: string) => {
    const { t } = useTranslation();
    const [selectedDate, setSelectedDate] = useState<string>('');

    const dateRange = useMemo(() => {
        if (!tripStartDate) return [];
        const dates: string[] = [];
        const start = new Date(tripStartDate);
        const end = tripEndDate ? new Date(tripEndDate) : new Date(tripStartDate);
        let current = new Date(start);
        let count = 0;
        while (current <= end && count < 31) {
            const dateStr = getLocalDateString(current);
            dates.push(dateStr);
            current.setDate(current.getDate() + 1);
            count++;
        }
        return dates;
    }, [tripStartDate, tripEndDate]);

    useEffect(() => {
        if (dateRange.length > 0 && !selectedDate) {
            const today = getLocalDateString();
            // 旅行期間中に今日が含まれていれば、今日をデフォルト選択にする
            if (dateRange.includes(today)) {
                setSelectedDate(today);
            } else {
                setSelectedDate(dateRange[0]);
            }
        } else if (dateRange.length === 0 && !selectedDate) {
            setSelectedDate(getLocalDateString());
        }
    }, [dateRange, selectedDate]);

    const getDayLabel = (dateStr: string, index: number) => {
        const d = new Date(dateStr);
        const weekDays = t('common.daysShort') ? t('common.daysShort').split(',') : ['日', '月', '火', '水', '木', '金', '土'];
        return {
            day: t('dashboard.dayN', { day: index + 1 }),
            date: `${d.getDate()}`,
            week: weekDays[d.getDay()],
        };
    };

    const isTodayDate = (dateStr: string) => {
        if (!dateStr) return false;
        return dateStr === getLocalDateString();
    };

    return {
        selectedDate,
        setSelectedDate,
        dateRange,
        getDayLabel,
        isTodayDate,
    };
};
