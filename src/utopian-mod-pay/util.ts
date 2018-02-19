export interface CategoryValue {
  reviewed: number;
  flagged: number;
}

export function formatCat(cat: string): string {
  return cat.replace('-', ' ').replace(/\w\S*/g, (str) => {
    return str.charAt(0).toUpperCase() + str.substring(1);
  });
}
