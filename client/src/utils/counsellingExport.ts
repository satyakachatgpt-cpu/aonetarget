import * as XLSX from 'xlsx';

export type ExportPeriod = 'daily' | 'weekly' | 'monthly' | 'all';

export interface CounsellingLeadRecord {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  interestedCategory?: string;
  message?: string;
  status: 'new' | 'contacted' | 'resolved';
  source: string;
  createdAt: string;
}

export const EXPORT_PERIOD_LABELS: Record<ExportPeriod, string> = {
  daily: 'Daily (Today)',
  weekly: 'Weekly (Last 7 Days)',
  monthly: 'Monthly (Last 30 Days)',
  all: 'All Inquiries',
};

export function formatLeadSource(source?: string): string {
  if (!source || source === 'student_explore_cta') return 'Explore Courses Page';
  if (source === 'news_read_more' || source === 'news_reader_app') return 'News & Notification Page';
  return source
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isNewsLead(lead: Pick<CounsellingLeadRecord, 'source' | 'message'>): boolean {
  return (
    lead.source === 'news_read_more' ||
    lead.source === 'news_reader_app' ||
    /^Reader Lead:/i.test(lead.message || '')
  );
}

export function formatLeadMessage(lead: Pick<CounsellingLeadRecord, 'source' | 'message'>): string {
  const raw = (lead.message || '').trim();
  if (!raw) return '-';
  if (/^Reader Lead:\s*/i.test(raw)) {
    return `News: ${raw.replace(/^Reader Lead:\s*/i, '').trim()}`;
  }
  return raw;
}

export function filterLeadsByPeriod(
  leads: CounsellingLeadRecord[],
  period: ExportPeriod,
  now: Date = new Date()
): CounsellingLeadRecord[] {
  if (period === 'all') return leads;

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === 'weekly') {
    start.setDate(start.getDate() - 6);
  } else if (period === 'monthly') {
    start.setDate(start.getDate() - 29);
  }

  const startTime = start.getTime();
  return leads.filter((lead) => {
    if (!lead.createdAt) return false;
    const createdTime = new Date(lead.createdAt).getTime();
    return !Number.isNaN(createdTime) && createdTime >= startTime;
  });
}

const COUNSELLING_EXPORT_HEADERS = [
  'S. No.',
  'Name',
  'Phone Number',
  'Email ID',
  'Interested Category',
  'Request From',
  'Message / Inquiry',
  'Status',
  'Date',
  'Time',
];

export function buildCounsellingWorkbook(
  leads: CounsellingLeadRecord[],
  period: ExportPeriod,
  now: Date = new Date()
): XLSX.WorkBook {
  const tableData = leads.map((lead, idx) => {
    const createdDate = lead.createdAt ? new Date(lead.createdAt) : null;
    const isValidDate = createdDate !== null && !Number.isNaN(createdDate.getTime());

    return {
      'S. No.': idx + 1,
      'Name': lead.name || '-',
      'Phone Number': lead.phone || '-',
      'Email ID': lead.email || 'N/A',
      'Interested Category': lead.interestedCategory || 'Not specified',
      'Request From': formatLeadSource(lead.source),
      'Message / Inquiry': formatLeadMessage(lead),
      'Status': lead.status ? lead.status.toUpperCase() : '-',
      'Date': isValidDate
        ? createdDate.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        : '-',
      'Time': isValidDate
        ? createdDate.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          })
        : '-',
    };
  });

  const ws = XLSX.utils.aoa_to_sheet([]);
  XLSX.utils.sheet_add_json(ws, tableData, {
    origin: 'A4',
    header: COUNSELLING_EXPORT_HEADERS,
  });

  XLSX.utils.sheet_add_aoa(
    ws,
    [
      ['A ONE TARGET - COUNSELLING INQUIRIES REPORT'],
      [`Period: ${EXPORT_PERIOD_LABELS[period]} | Total Inquiries: ${leads.length} | Generated At: ${now.toLocaleString('en-IN')}`],
    ],
    { origin: 'A1' }
  );

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
  ];

  ws['!cols'] = [
    { wch: 8 },  // S. No.
    { wch: 24 }, // Name
    { wch: 15 }, // Phone Number
    { wch: 28 }, // Email ID
    { wch: 24 }, // Interested Category
    { wch: 22 }, // Request From
    { wch: 45 }, // Message / Inquiry
    { wch: 12 }, // Status
    { wch: 14 }, // Date
    { wch: 15 }, // Time
  ];

  ws['!autofilter'] = { ref: `A4:J${tableData.length + 4}` };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Counselling Inquiries');
  return wb;
}

export function exportCounsellingLeadsToExcel(
  leads: CounsellingLeadRecord[],
  period: ExportPeriod,
  now: Date = new Date()
): number {
  const filtered = filterLeadsByPeriod(leads, period, now);
  if (filtered.length === 0) return 0;

  const wb = buildCounsellingWorkbook(filtered, period, now);
  const periodSlug = period.charAt(0).toUpperCase() + period.slice(1);
  const dateSlug = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  XLSX.writeFile(wb, `Counselling_Inquiries_${periodSlug}_${dateSlug}.xlsx`);
  return filtered.length;
}
