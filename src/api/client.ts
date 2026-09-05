import { API_BASE_URL } from '../shared/constants';
import type {
  BankResponse,
  BankSearchResponse,
  BranchResponse,
  BranchSearchResponse,
  ErrorResponse,
} from './types';

export class ZenginApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ZenginApiError';
    this.code = code;
    this.status = status;
  }
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const error = (value as { error: unknown }).error;
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code: unknown }).code === 'string' &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

async function request<T>(
  path: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<T> {
  const url = new URL(path, API_BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new ZenginApiError('network_error', 'ネットワークに接続できませんでした。', 0);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ZenginApiError(
      'invalid_response',
      'サーバーからの応答を解析できませんでした。',
      response.status,
    );
  }

  if (!response.ok) {
    if (isErrorResponse(body)) {
      throw new ZenginApiError(body.error.code, body.error.message, response.status);
    }
    throw new ZenginApiError(
      'unknown_error',
      `リクエストに失敗しました(${response.status})。`,
      response.status,
    );
  }

  return body as T;
}

export function searchBanks(name: string, signal?: AbortSignal): Promise<BankSearchResponse> {
  return request<BankSearchResponse>('/api/banks', { name }, signal);
}

export function getBank(bankCode: string, signal?: AbortSignal): Promise<BankResponse> {
  return request<BankResponse>(`/api/banks/${encodeURIComponent(bankCode)}`, {}, signal);
}

export function searchBranches(
  bankCode: string,
  name: string,
  signal?: AbortSignal,
): Promise<BranchSearchResponse> {
  return request<BranchSearchResponse>(
    `/api/banks/${encodeURIComponent(bankCode)}/branches`,
    { name },
    signal,
  );
}

export function getBranch(
  bankCode: string,
  branchCode: string,
  signal?: AbortSignal,
): Promise<BranchResponse> {
  return request<BranchResponse>(
    `/api/banks/${encodeURIComponent(bankCode)}/branches/${encodeURIComponent(branchCode)}`,
    {},
    signal,
  );
}
