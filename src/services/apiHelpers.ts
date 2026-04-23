import { AxiosError } from 'axios';

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    return (error.response?.data as { message?: string } | undefined)?.message || error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
