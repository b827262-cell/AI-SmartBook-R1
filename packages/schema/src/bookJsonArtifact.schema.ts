import { z } from "zod";

export const ARTIFACT_TYPES = ["page-index", "sentence-index", "question-bank-candidates", "smart-solve-candidates"] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export interface BookJsonArtifact {
  id: string;
  bookId: string;
  artifactType: ArtifactType;
  fileName: string;
  filePath: string;
  recordCount: number;
  status: "pending" | "done" | "error";
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookJsonArtifactSummary {
  id: string;
  bookId: string;
  artifactType: ArtifactType;
  fileName: string;
  recordCount: number;
  status: "pending" | "done" | "error";
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  downloadUrl: string;
}

export interface GenerateArtifactsResponse {
  bookId: string;
  artifacts: BookJsonArtifactSummary[];
}

export const artifactTypeSchema = z.enum(ARTIFACT_TYPES);
