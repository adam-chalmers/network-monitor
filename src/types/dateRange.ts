type Exclusion<T> = { [key in keyof T]?: never };

export interface DayRange {
    dayStart?: number;
    dayEnd?: number;
}

export interface Days {
    days: number[];
}

export interface TimeRange {
    timeStart: number;
    timeEnd: number;
}

export type DateRange = ((DayRange & Exclusion<Days>) | (Days & Exclusion<DayRange>)) & {
    timeRanges?: TimeRange[];
};
