

export function createSearchableFields<T>(
  document: T,
  fields: string[]
): Record<string, string> {
  const searchableFields: Record<string, string> = {};

  fields.forEach(field => {
    const value = getNestedValue(document, field);
    if (value !== undefined) {
      searchableFields[field] = normalizeFieldValue(value);
    }
  });

  return searchableFields;
}

export function normalizeFieldValue(value: any): string {
  if (typeof value === 'string') {
    return value.toLowerCase().trim();
  }
  if (Array.isArray(value)) {
    return value.map(v => normalizeFieldValue(v)).join(' ');
  }
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).map(v => normalizeFieldValue(v)).join(' ');
  }
  return String(value);
}

export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => 
    current && current[key] !== undefined ? current[key] : undefined, 
    obj
  );
}

export function optimizeIndex(data: any[]): any[] {
  // Remove duplicates
  const uniqueData = Array.from(new Set(data.map(item => 
    JSON.stringify(item)
  ))).map(item => JSON.parse(item));

  // Sort for binary search optimization
  return uniqueData.sort((a, b) => 
    JSON.stringify(a).localeCompare(JSON.stringify(b))
  );
}

