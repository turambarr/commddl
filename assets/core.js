/* CommDDL domain logic: shared by the build, browser, and business-rule tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CommCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DAY = 86400000;
  const SUBMISSION_TYPES = new Set(['abstract', 'paper', 'registration', 'proposal', 'results']);
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  function validDate(value) {
    if (!datePattern.test(value || '')) return false;
    const d = new Date(value + 'T00:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
  }
  function dateInZone(value, zone = 'Asia/Shanghai') {
    return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
  }
  function parseInstant(value) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(value || '')) return null;
    if (!validDate(value.slice(0, 10))) return null;
    const [, h, m, s] = value.match(/T(\d{2}):(\d{2}):(\d{2})/);
    if (+h > 23 || +m > 59 || +s > 59) return null;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  function countdown(instant, now = Date.now()) {
    const ms = parseInstant(instant);
    if (ms === null) return null;
    if (ms <= now) return '已截止';
    let seconds = Math.floor((ms - now) / 1000);
    const days = Math.floor(seconds / 86400); seconds %= 86400;
    const hours = Math.floor(seconds / 3600); seconds %= 3600;
    const minutes = Math.floor(seconds / 60); seconds %= 60;
    return (days ? days + '天 ' : '') + [hours, minutes, seconds].map(n => String(n).padStart(2, '0')).join(':');
  }
  function primaryNode(call) {
    return (call.nodes || []).find(n => n.primary) || (call.nodes || []).find(n => SUBMISSION_TYPES.has(n.type)) || null;
  }
  function calendarDate(node, zone = 'Asia/Shanghai') {
    if (!node) return null;
    if (node.precision === 'instant') {
      const ms = parseInstant(node.instant);
      return ms === null ? null : dateInZone(ms, zone);
    }
    return node.precision === 'date' && validDate(node.date) ? node.date : null;
  }
  function stateOf(call, now = Date.now(), zone = 'Asia/Shanghai') {
    if (['cancelled', 'conflict', 'closed'].includes(call.status)) return { code: call.status, days: null };
    if (call.verification === 'pending') return { code: 'pending', days: null };
    if (call.status === 'rolling') return { code: 'rolling', days: null };
    const node = primaryNode(call);
    if (!node) return { code: 'pending', days: null };
    const date = calendarDate(node, zone);
    if (!date) return { code: 'pending', days: null };
    const today = dateInZone(now, zone);
    const days = Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / DAY);
    if (node.precision === 'instant' && parseInstant(node.instant) < now) return { code: 'closed', days };
    if (node.precision === 'date' && days < 0) return { code: 'past-date', days };
    for (const prerequisiteId of node.requires || []) {
      const prerequisite = call.nodes.find(n => n.id === prerequisiteId);
      if (!prerequisite) return { code: 'conflict', days };
      const prerequisiteDate = calendarDate(prerequisite, zone);
      if ((prerequisite.precision === 'instant' && parseInstant(prerequisite.instant) < now) ||
          (prerequisite.precision === 'date' && prerequisiteDate < today)) return { code: 'restricted', days };
    }
    return { code: node.precision === 'instant' ? 'upcoming' : 'date', days };
  }
  const normal = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[\s\-–_]/g, '');
  function searchMatches(query, ...fields) {
    const words = String(query || '').trim().split(/\s+/).filter(Boolean);
    const text = normal(fields.flat(Infinity).join(' '));
    return words.every(word => text.includes(normal(word)));
  }
  function cleanTopics(ids, topics, area = '') {
    const allowed = new Set((topics || []).filter(t => !area || t.areas.includes(area)).map(t => t.id));
    return [...new Set((Array.isArray(ids) ? ids : []).filter(id => allowed.has(id)))];
  }
  function topicMatches(ids, selected) {
    return !selected?.length || selected.some(id => (ids || []).includes(id));
  }
  function topicSearch(ids, taxonomy = []) {
    return taxonomy.filter(t => (ids || []).includes(t.id)).flatMap(t => [t.label, t.aliases]);
  }
  function filterVenues(venues, filters = {}) {
    const favorites = new Set(filters.favorites || []);
    return venues.filter(v =>
      (!filters.venueKind || v.kind === filters.venueKind) &&
      (!filters.area || v.areas.includes(filters.area)) && topicMatches(v.topics, filters.topics) &&
      (!filters.historical || (v.assessments || []).some(a => a.system === 'bupt-ict-2018')) &&
      (!filters.favoriteOnly || favorites.has('venue:' + v.id)) &&
      (!filters.journalType || filters.journalType === 'all' || v.publicationType === filters.journalType) &&
      searchMatches(filters.query, v.short, v.nameEn, v.nameZh, v.aliases, v.summary, topicSearch(v.topics, filters.taxonomy))
    ).sort((a,b) => a.short.localeCompare(b.short));
  }
  function filterCalls(calls, venues, filters, now = Date.now()) {
    const byId = new Map(venues.map(v => [v.id, v]));
    const favorites = new Set(filters.favorites || []);
    return calls.filter(call => {
      const v = byId.get(call.venueId);
      if (!v) return false;
      const st = stateOf(call, now, filters.zone);
      if (!filters.showPast && ['closed', 'past-date', 'cancelled'].includes(st.code)) return false;
      if (filters.kind && filters.kind !== 'all' && call.kind !== filters.kind) return false;
      if (filters.area && !(call.areas || v.areas || []).includes(filters.area)) return false;
      const topics = call.topics || v.topics || [];
      if (!topicMatches(topics, filters.topics)) return false;
      if (filters.historical && !(v.assessments || []).some(a => a.system === 'bupt-ict-2018') ) return false;
      if (filters.favoriteOnly && !favorites.has('call:' + call.id) && !favorites.has('venue:' + v.id)) return false;
      if (filters.window && (!['upcoming', 'date', 'restricted'].includes(st.code) || st.days < 0 || st.days > +filters.window)) return false;
      return searchMatches(filters.query, call.title, call.titleEn, call.tags, call.summary, v.short, v.nameEn, v.nameZh, v.aliases, topicSearch(topics, filters.taxonomy));
    }).sort((a, b) => {
      const aDate = calendarDate(primaryNode(a), filters.zone) || '9999';
      const bDate = calendarDate(primaryNode(b), filters.zone) || '9999';
      if (filters.sort === 'name') return byId.get(a.venueId).short.localeCompare(byId.get(b.venueId).short);
      return aDate.localeCompare(bDate) || a.id.localeCompare(b.id);
    });
  }
  function escapeICS(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
  }
  function foldLine(line) {
    const encoder = new TextEncoder();
    const lines = []; let current = ''; let size = 0;
    for (const char of line) {
      const bytes = encoder.encode(char).length;
      if (size + bytes > 75) { lines.push(current); current = ' '; size = 1; }
      current += char; size += bytes;
    }
    lines.push(current); return lines.join('\r\n');
  }
  const icsUTC = value => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  function eligibleNodes(calls, includeDateOnly) {
    const result = [];
    for (const call of calls) {
      if (call.verification !== 'verified' || call.status === 'conflict') continue;
      for (const node of call.nodes || []) {
        if (!SUBMISSION_TYPES.has(node.type)) continue;
        if (node.precision === 'instant' && parseInstant(node.instant) !== null) result.push({ call, node });
        else if (includeDateOnly && node.precision === 'date' && validDate(node.date)) result.push({ call, node });
      }
    }
    return result;
  }
  function createICS(calls, venues, options = {}) {
    const map = new Map(venues.map(v => [v.id, v]));
    const generated = options.generatedAt || new Date().toISOString();
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CommDDL//Communications Calendar//ZH', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:' + escapeICS(options.name || 'CommDDL 通信投稿日历')];
    for (const {call, node} of eligibleNodes(calls, options.includeDateOnly === true)) {
      const v = map.get(call.venueId);
      const dateOnly = node.precision === 'date';
      const note = dateOnly ? '日期提示：官网未明确具体钟点或时区，此全天事件不代表当天任何时间均可投稿。' : '请同时核对官方投稿入口。';
      const prerequisite = (node.requires || []).length ? '\n需先完成摘要或注册等前置步骤。' : '';
      lines.push('BEGIN:VEVENT', 'UID:' + call.id + '-' + node.id + '@commddl', 'DTSTAMP:' + icsUTC(generated), 'LAST-MODIFIED:' + icsUTC(call.updatedAt || generated), 'SEQUENCE:' + (node.revision || 0));
      if (dateOnly) {
        lines.push('DTSTART;VALUE=DATE:' + node.date.replace(/-/g, ''));
        const next = new Date(Date.parse(node.date + 'T00:00:00Z') + DAY).toISOString().slice(0, 10);
        lines.push('DTEND;VALUE=DATE:' + next.replace(/-/g, ''));
      } else { lines.push('DTSTART:' + icsUTC(node.instant)); }
      if (call.status === 'cancelled') lines.push('STATUS:CANCELLED');
      lines.push('SUMMARY:' + escapeICS((v ? v.short + ' · ' : '') + call.title + ' · ' + node.label + (dateOnly ? '（日期提示）' : '')),
        'DESCRIPTION:' + escapeICS(note + prerequisite + '\n' + (call.notes || '') + '\n来源：' + (node.sourceUrl || call.sourceUrl)),
        'URL:' + (node.sourceUrl || call.sourceUrl), 'TRANSP:TRANSPARENT', 'END:VEVENT');
    }
    lines.push('END:VCALENDAR'); return lines.map(foldLine).join('\r\n') + '\r\n';
  }
  function cleanFavorites(value, data) {
    if (!value || value.version !== 1 || !Array.isArray(value.items) || value.items.length > 1000) throw new Error('请选择 CommDDL 导出的收藏备份文件。');
    const allowed = new Set([...data.calls.map(c => 'call:' + c.id), ...data.venues.map(v => 'venue:' + v.id)]);
    return [...new Set(value.items.filter(x => typeof x === 'string' && allowed.has(x)))];
  }
  return { validDate, dateInZone, parseInstant, countdown, primaryNode, calendarDate, stateOf, searchMatches, cleanTopics, topicMatches, filterVenues, filterCalls, escapeICS, foldLine, eligibleNodes, createICS, cleanFavorites };
});
