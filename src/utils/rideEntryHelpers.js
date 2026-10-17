export function getLocalDateString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getLast7DayStrings() {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(getLocalDateString(d));
  }
  return dates;
}

export function normalizeRideEntriesResponse(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.entries)) return data.entries;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

export function normalizeEntryDate(entry) {
  const raw = entry?.entry_date ?? entry?.entryDate ?? entry?.created_at ?? entry?.entry_timestamp;
  if (raw == null || raw === '') return '';
  if (typeof raw === 'string') {
    return raw.split('T')[0];
  }
  if (raw instanceof Date) {
    return getLocalDateString(raw);
  }
  return String(raw).split('T')[0];
}

export function getCustomerCount(entry) {
  return entry.customer_count ?? entry.customerCount ?? 0;
}

export function isManualEntry(entry) {
  const type = (entry.entry_type ?? entry.entryType ?? 'manual').toLowerCase();
  return type === 'manual';
}

export function getEntrySortTimestamp(entry) {
  if (entry.entry_timestamp) {
    const t = new Date(entry.entry_timestamp).getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (entry.created_at) {
    const t = new Date(entry.created_at).getTime();
    if (!Number.isNaN(t)) return t;
  }
  const date = normalizeEntryDate(entry);
  const time = entry.entry_time ?? entry.entryTime ?? '00:00:00';
  const timeStr = typeof time === 'string' ? time : '00:00:00';
  const t = new Date(`${date}T${timeStr}`).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function formatEntryTime(entry) {
  const time = entry.entry_time ?? entry.entryTime;
  if (!time) return '';
  if (typeof time === 'string') {
    const parts = time.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parts[1];
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${m} ${ampm}`;
    }
  }
  return String(time);
}

export function isEntryOnDate(entry, dateStr) {
  return normalizeEntryDate(entry) === dateStr;
}

export function buildRecentManualEntries(entries, limit = 3) {
  const list = Array.isArray(entries) ? entries : [];
  return list
    .filter(isManualEntry)
    .map((entry) => ({
      id: entry.id,
      rideName: entry.ride_name || entry.rideName || 'Unknown Ride',
      customerCount: getCustomerCount(entry),
      entryDate: normalizeEntryDate(entry),
      entryTimeLabel: formatEntryTime(entry),
      sortTime: getEntrySortTimestamp(entry),
    }))
    .sort((a, b) => b.sortTime - a.sortTime)
    .slice(0, limit);
}

export function sumManualCustomersOnDate(entries, dateStr) {
  const list = Array.isArray(entries) ? entries : [];
  return list
    .filter(isManualEntry)
    .filter((entry) => isEntryOnDate(entry, dateStr))
    .reduce((sum, entry) => sum + getCustomerCount(entry), 0);
}

export function countManualEntriesOnDate(entries, dateStr) {
  const list = Array.isArray(entries) ? entries : [];
  return list.filter(isManualEntry).filter((entry) => isEntryOnDate(entry, dateStr)).length;
}
