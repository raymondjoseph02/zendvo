export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data?: {
    userId: string;
    email: string;
  };
  error?: string;
  details?: unknown;
}
