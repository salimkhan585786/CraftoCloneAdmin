import { AxiosError } from 'axios';
import { API } from '../lib/api';
import { AdminTemplate, TemplatePayload } from '../types';

interface ApiEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    return (error.response?.data as { message?: string } | undefined)?.message || error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
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

export const templateService = {
  createTemplate,
  updateTemplate,
  deleteTemplate,
};
