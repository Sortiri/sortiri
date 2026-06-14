export class SortiriError extends Error {
  status?: number;
  response?: unknown;

  constructor(message: string, options?: { status?: number; response?: unknown }) {
    super(message);
    this.name = "SortiriError";
    this.status = options?.status;
    this.response = options?.response;
  }
}
