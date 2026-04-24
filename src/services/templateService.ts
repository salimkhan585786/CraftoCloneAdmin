import { API } from '../lib/api';
import {
  AdminTemplate,
  AdminTemplateSummary,
  ApiEnvelope,
  PaginatedResponse,
  PresignedUploadPayload,
  TemplateListParams,
  TemplatePayload,
  UploadedAsset,
} from '../types';
import { getErrorMessage } from './apiHelpers';

interface PresignedUploadResponse {
  upload_url?: string;
  uploadUrl?: string;
  presigned_url?: string;
  presignedUrl?: string;
  url?: string;
  file_url?: string;
  fileUrl?: string;
  public_url?: string;
  publicUrl?: string;
  cdnUrl?: string;
  key?: string;
  file_key?: string;
  fileKey?: string;
  fields?: Record<string, string>;
}

function isCorsUploadFailure(error: unknown) {
  return error instanceof TypeError && /failed to fetch/i.test(error.message);
}

function getUploadUrl(data: PresignedUploadResponse) {
  return data.upload_url || data.uploadUrl || data.presigned_url || data.presignedUrl || data.url || null;
}

function getAssetKey(data: PresignedUploadResponse) {
  return data.key || data.file_key || data.fileKey || '';
}

function getAssetUrl(data: PresignedUploadResponse) {
  return data.cdnUrl || data.file_url || data.fileUrl || data.public_url || data.publicUrl || null;
}

async function listTemplates(params: TemplateListParams = {}) {
  try {
    const response = await API.get<ApiEnvelope<PaginatedResponse<AdminTemplateSummary>>>('/v1/templates', {
      params: {
        category_id: params.category_id,
        language: params.language,
        is_premium: params.is_premium,
        type: params.type,
        search: params.search?.trim() || undefined,
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      },
    });
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load templates.'));
  }
}

async function getTemplate(id: string) {
  try {
    const response = await API.get<ApiEnvelope<AdminTemplate>>(`/v1/templates/${id}`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load template details.'));
  }
}

async function createTemplate(payload: TemplatePayload) {
  try {
    const response = await API.post<ApiEnvelope<AdminTemplate>>('/v1/templates/admin', payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to create template.'));
  }
}

async function updateTemplate(id: string, payload: TemplatePayload) {
  try {
    const response = await API.put<ApiEnvelope<AdminTemplate>>(`/v1/templates/admin/${id}`, payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to update template.'));
  }
}

async function deleteTemplate(id: string) {
  try {
    const response = await API.delete<ApiEnvelope<AdminTemplate>>(`/v1/templates/admin/${id}`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to delete template.'));
  }
}

async function getPresignedUpload(payload: PresignedUploadPayload) {
  const response = await API.post<ApiEnvelope<PresignedUploadResponse>>('/v1/s3/presigned-url', payload, {
    skipAuthRefresh: true,
  });

  return response.data.data;
}

async function uploadAsset(file: File): Promise<UploadedAsset> {
  try {
    const presigned = await getPresignedUpload({
      fileName: file.name,
      category: 'template',
      contentType: file.type || 'application/octet-stream',
    });

    const uploadUrl = getUploadUrl(presigned);
    const assetKey = getAssetKey(presigned);

    if (!uploadUrl || !assetKey) {
      throw new Error('Upload URL or asset key missing from presigned upload response.');
    }

    if (presigned.fields && Object.keys(presigned.fields).length > 0) {
      const formData = new FormData();
      Object.entries(presigned.fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append('file', file);

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Unable to upload file to storage.');
      }
    } else {
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Unable to upload file to storage.');
      }
    }

    return {
      key: assetKey,
      url: getAssetUrl(presigned),
    };
  } catch (error) {
    if (isCorsUploadFailure(error)) {
      throw new Error('Upload blocked by S3 CORS configuration. Frontend is ready, but the bucket must allow your app origin for presigned uploads.');
    }

    throw new Error(getErrorMessage(error, 'Unable to upload asset.'));
  }
}

export const templateService = {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  uploadAsset,
};
