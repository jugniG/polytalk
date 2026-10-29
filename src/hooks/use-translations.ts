import { useQuery } from "@tanstack/react-query";

export function useTranslations() {
  return useQuery({
    queryKey: ['/api/translation'],
    queryFn: async () => {
      const res = await fetch('/api/translation');
      if (!res.ok) throw new Error("Failed to fetch translations");
      const data = await res.json();
      return data;
    }
  });
}
