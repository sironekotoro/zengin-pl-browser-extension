// zengin-pl-api の openapi.yaml (components.schemas) に対応する型定義。
// https://github.com/sironekotoro/zengin-pl-api/blob/main/openapi.yaml

/** additionalProperties: true のため、未知のキーを許容する */
export interface Bank {
  code: string;
  name: string;
  hira?: string;
  kana?: string;
  roma?: string;
  [key: string]: unknown;
}

/** additionalProperties: false */
export interface BankSummary {
  code: string;
  name: string;
}

/** additionalProperties: true のため、未知のキーを許容する */
export interface Branch {
  code: string;
  name: string;
  hira?: string;
  kana?: string;
  roma?: string;
  [key: string]: unknown;
}

/** additionalProperties: false */
export interface BranchSummary {
  code: string;
  name: string;
}

export interface BankResponse {
  bank: Bank;
}

export interface BankSearchResponse {
  banks: Bank[];
}

export interface BranchResponse {
  bank: BankSummary;
  branch: Branch;
}

export interface BranchSearchResponse {
  bank: BankSummary;
  branches: BranchSummary[];
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ErrorResponse {
  error: ApiError;
}
