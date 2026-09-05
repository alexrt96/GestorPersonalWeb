export interface DevicePoint {
    latitude: number;
    longitude: number;
    timestamp: number;
}

export interface Device {
    id: string;
    name: string;
    createdAt: number;
    point: DevicePoint | null;
}

export interface BlacklistEntry {
    macAddress: string;
    deviceName: string;
    addedAt: number;
}

export interface CarLog {
    id: number;
    timestamp: number;
    level: string;
    tag: string;
    message: string;
    deviceId: string | null;
}

export interface ShoppingItem {
    id: number;
    name: string;
    quantity: number;
    checked: boolean;
    createdAt: number;
    category: string | null;
}

export interface ShoppingTemplate {
    id: number;
    name: string;
    createdAt: number;
    itemCount: number;
}

export interface ShoppingTemplateItem {
    name: string;
    quantity: number;
}

export interface ShoppingTemplateDetail {
    id: number;
    name: string;
    createdAt: number;
    items: ShoppingTemplateItem[];
}

export interface WoffuLog {
    id: number;
    type: string;
    message: string;
    timestamp: number;
}

export interface WoffuSettings {
    token: string | null;
    userId: number | null;
    isActivated: boolean;
}

export interface HoursFormatted {
    resource: string | null;
    values: string[] | null;
}

export interface AbsenceEvent {
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    totalTime: number;
    totalTimeFormatted: HoursFormatted | null;
}

export interface CalendarEvents {
    isHoliday: boolean;
    isEvent: boolean;
    holidayNames: string[] | null;
    eventNames: string[] | null;
}

export interface Diary {
    diaryId: number;
    diarySummaryId: number;
    userId: number;
    date: string;
    isWeekend: boolean;
    isHoliday: boolean;
    name: string | null;
    comments: string | null;
    differenceTime: number;
    in: string | null;
    out: string | null;
    absenceEvents: AbsenceEvent[] | null;
    calendarEvents: CalendarEvents | null;
    isPending: boolean;
    isToday: boolean;
    isDiffHoursDanger: boolean;
    isInDanger: boolean;
    isOutDanger: boolean;
    workingTimeFormatted: HoursFormatted | null;
    workedTimeFormatted: HoursFormatted | null;
    differenceTimeFormatted: HoursFormatted | null;
    scheduleTimeFormatted: HoursFormatted | null;
    maxStartTime: string | null;
    minEndTime: string | null;
}

export interface DiaryMonth {
    diaries: Diary[];
    totalWorkingTimeFormatted: HoursFormatted | null;
    totalWorkedTimeFormatted: HoursFormatted | null;
    totalDifferenceTimeFormatted: HoursFormatted | null;
    totalScheduleTimeFormatted: HoursFormatted | null;
    totalRecords: number;
}

export interface DiaryBaseWorkDay {
    diarySummaryId: number;
    userId: number;
    scheduleName: string | null;
    date: string | null;
    startTime: string | null;
    endTime: string | null;
    endTime1: string | null;
    startTime2: string | null;
    endTime2: string | null;
    workingTime: number;
    workedTime: number;
    isFlexible: boolean;
    useSign: boolean;
}

export interface SlotSign {
    signId: number;
    userId: number;
    date: string | null;
    signIn: boolean;
    time: string | null;
    shortTime: string | null;
    shortTrueTime: string | null;
    deleted: boolean;
    updatedOn: string | null;
}

export interface WorkdaySlot {
    in: SlotSign | null;
    out: SlotSign | null;
    motive: string | null;
}

export interface WorkdaySlotsInfo {
    diaryBaseWorkDay: DiaryBaseWorkDay | null;
    slots: WorkdaySlot[] | null;
}
