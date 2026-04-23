import { API } from '../lib/api';
import { AdminTemplate, ApiEnvelope, TemplatePayload } from '../types';
import { getErrorMessage } from './apiHelpers';

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
