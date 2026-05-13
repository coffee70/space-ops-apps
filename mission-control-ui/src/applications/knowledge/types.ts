export type KnowledgeDocument = {
  id: string;
  title: string;
  document_type: string;
  mission_id?: string | null;
  vehicle_id?: string | null;
  subsystem_id?: string | null;
  tags?: string[];
  description?: string | null;
  ingestion_status: "pending" | "ready" | "failed" | string;
  ingestion_error?: string | null;
  created_at: string;
  updated_at: string;
};

export type KnowledgeUploadInput = {
  file: File;
  title?: string;
  documentType?: string;
  missionId?: string;
  vehicleId?: string;
  subsystemId?: string;
  tags?: string;
  description?: string;
};

export type KnowledgeUploadResponse = {
  document_id: string;
  title: string;
  ingestion_status: "pending" | "ready" | "failed" | string;
};

export type KnowledgeDeleteResponse = {
  deleted: boolean;
  document_id: string;
};
