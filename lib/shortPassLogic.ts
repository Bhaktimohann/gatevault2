export const DEFAULT_SHORT_PASS_DURATION_HOURS = 16;
export const DEFAULT_SHORT_PASS_GRACE_MINUTES = 10;

export type ShortPassStatus = "Active" | "Overdue" | "On Time" | "On Time (Grace)" | "Late" | "Invalid Short Pass";

type ShortPassInput = {
  outTime: Date;
  inTime?: Date | null;
  allowedDurationHours?: number;
  graceMinutes?: number;
  currentTime?: Date;
};

export function addMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60 * 1000);
}

export function addHours(value: Date, hours: number) {
  return addMinutes(value, hours * 60);
}

export function minutesBetween(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / 60000);
}

export function evaluateShortPass({
  outTime,
  inTime = null,
  allowedDurationHours = DEFAULT_SHORT_PASS_DURATION_HOURS,
  graceMinutes = DEFAULT_SHORT_PASS_GRACE_MINUTES,
  currentTime = new Date(),
}: ShortPassInput) {
  const expectedReturnTime = addHours(outTime, allowedDurationHours);
  const graceReturnTime = addMinutes(expectedReturnTime, graceMinutes);

  if (inTime && inTime <= outTime) {
    return {
      status: "Invalid Short Pass" as ShortPassStatus,
      totalDurationMinutes: 0,
      expectedReturnTime,
      lateDurationMinutes: 0,
    };
  }

  const totalDurationMinutes = inTime ? minutesBetween(outTime, inTime) : null;

  if (totalDurationMinutes !== null && totalDurationMinutes < 0) {
    return {
      status: "Invalid Short Pass" as ShortPassStatus,
      totalDurationMinutes: 0,
      expectedReturnTime,
      lateDurationMinutes: 0,
    };
  }

  if (inTime) {
    if (inTime <= expectedReturnTime) {
      return {
        status: "On Time" as ShortPassStatus,
        totalDurationMinutes,
        expectedReturnTime,
        lateDurationMinutes: 0,
      };
    }

    if (inTime <= graceReturnTime) {
      return {
        status: "On Time (Grace)" as ShortPassStatus,
        totalDurationMinutes,
        expectedReturnTime,
        lateDurationMinutes: 0,
      };
    }

    return {
      status: "Late" as ShortPassStatus,
      totalDurationMinutes,
      expectedReturnTime,
      lateDurationMinutes: minutesBetween(expectedReturnTime, inTime),
    };
  }

  return {
    status: currentTime > expectedReturnTime ? "Overdue" : "Active",
    totalDurationMinutes,
    expectedReturnTime,
    lateDurationMinutes: 0,
  };
}

export function isInvalidRequestedShortPass(outTime: Date, inTime: Date, allowedDurationHours = DEFAULT_SHORT_PASS_DURATION_HOURS) {
  return inTime <= outTime || minutesBetween(outTime, inTime) > allowedDurationHours * 60;
}
