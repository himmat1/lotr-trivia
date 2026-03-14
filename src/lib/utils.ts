import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Merge Tailwind classes safely — resolves conflicts (e.g., text-red vs text-blue)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
