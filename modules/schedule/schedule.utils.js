const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const normalizeDate = (value) => String(value || "").trim();

const isValidDateString = (value) => {
  const normalizedValue = normalizeDate(value);
  if (!DATE_PATTERN.test(normalizedValue)) return false;

  const [year, month, day] = normalizedValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseTimeToMinutes = (value) => {
  const normalizedValue = String(value || "").trim();
  if (!TIME_PATTERN.test(normalizedValue)) return Number.NaN;

  const [hours, minutes] = normalizedValue.split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (value) => {
  const hours = String(Math.floor(value / 60)).padStart(2, "0");
  const minutes = String(value % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const generateTimeSlots = (startTime, endTime, consultationTime) => {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  const step = Number(consultationTime);

  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) {
    return [];
  }

  if (!Number.isInteger(step) || step <= 0 || endMinutes <= startMinutes) {
    return [];
  }

  const slots = [];

  for (let cursor = startMinutes; cursor + step <= endMinutes; cursor += step) {
    slots.push({
      time: minutesToTime(cursor),
      isBooked: false,
      patientTokenId: null,
    });
  }

  return slots;
};

const hasTimeOverlap = (leftStart, leftEnd, rightStart, rightEnd) => {
  const normalizedLeftStart = parseTimeToMinutes(leftStart);
  const normalizedLeftEnd = parseTimeToMinutes(leftEnd);
  const normalizedRightStart = parseTimeToMinutes(rightStart);
  const normalizedRightEnd = parseTimeToMinutes(rightEnd);

  if (
    !Number.isFinite(normalizedLeftStart) ||
    !Number.isFinite(normalizedLeftEnd) ||
    !Number.isFinite(normalizedRightStart) ||
    !Number.isFinite(normalizedRightEnd)
  ) {
    return false;
  }

  return normalizedLeftStart < normalizedRightEnd && normalizedRightStart < normalizedLeftEnd;
};

const formatCreatedAt = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);

module.exports = {
  TIME_PATTERN,
  DATE_PATTERN,
  normalizeDate,
  isValidDateString,
  getTodayDateString,
  parseTimeToMinutes,
  generateTimeSlots,
  hasTimeOverlap,
  formatCreatedAt,
};
