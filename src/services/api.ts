const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export const api = {
  get: async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });
    if (!response.ok) throw new Error("API Network response was not ok");
    return response.json();
  },

  post: async <T>(
    endpoint: string,
    body: unknown,
    options?: RequestInit
  ): Promise<T> => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: JSON.stringify(body),
      ...options,
    });
    if (!response.ok) throw new Error("API Network response was not ok");
    return response.json();
  },
};
