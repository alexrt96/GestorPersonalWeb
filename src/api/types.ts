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

export interface ShoppingSuggestion {
    name: string;
    category: string | null;
    uses: number;
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
    category: string | null;
}

export interface ShoppingTemplateDetail {
    id: number;
    name: string;
    createdAt: number;
    items: ShoppingTemplateItem[];
}

export interface PlaceCandidate {
    displayName: string;
    latitude: number;
    longitude: number;
}

export interface Destination {
    id: number;
    name: string;
    displayName: string;
    latitude: number;
    longitude: number;
    createdAt: number;
    note: string | null;
    category: string | null;
    visited: boolean;
}

export type DeadlineRepeat = "none" | "monthly" | "yearly";

/** Vencimiento de un usuario. `dueDate` es una fecha "yyyy-MM-dd" (sin hora ni zona). */
export interface Deadline {
    id: number;
    title: string;
    dueDate: string;
    remindDaysBefore: number;
    repeat: DeadlineRepeat;
    category: string | null;
    note: string | null;
    done: boolean;
    createdAt: number;
}

/** Campos editables de un vencimiento (los mismos al crear y al modificar). */
export interface DeadlineInput {
    title: string;
    dueDate: string;
    remindDaysBefore: number;
    repeat: DeadlineRepeat;
    category: string;
    note: string;
}

export interface Trip {
    id: number;
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
    note: string | null;
    createdAt: number;
    stopCount: number;
    packingCount: number;
    packingChecked: number;
}

export interface TripStop {
    id: number;
    day: string;
    /** "HH:mm" o null si no tiene hora. */
    time: string | null;
    title: string;
    place: string | null;
    note: string | null;
    /** Ubicación en el mapa (ambas o ninguna). */
    latitude: number | null;
    longitude: number | null;
}

export interface TripPackingItem {
    id: number;
    name: string;
    checked: boolean;
}

export interface TripDetail {
    id: number;
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
    note: string | null;
    createdAt: number;
    stops: TripStop[];
    packing: TripPackingItem[];
}

export interface TripInput {
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
    note: string;
}

export interface TripStopInput {
    title: string;
    day: string;
    time: string;
    place: string;
    note: string;
}

export interface AuthResponse {
    token: string;
    user: { id: number; username: string };
}

/** Módulos activables por usuario: id de módulo -> activado. */
export type ModuleSettings = Record<string, boolean>;

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
