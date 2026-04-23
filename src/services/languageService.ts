import { API } from '../lib/api';
import { ApiEnvelope, Language, LanguagePayload } from '../types';
import { getErrorMessage } from './apiHelpers';

async function listLanguages() {
  try {
    const response = await API.get<ApiEnvelope<Language[]>>('/v1/languages');
    return response.data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load languages.'));
  }
}

async function createLanguage(payload: LanguagePayload) {
  try {
    const response = await API.post<ApiEnvelope<Language>>('/v1/languages/admin', payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to create language.'));
  }
}

async function deleteLanguage(id: string) {
  try {
    const response = await API.delete<ApiEnvelope<Language>>(`/v1/languages/admin/${id}`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to remove language.'));
  }
}

export const languageService = {
  listLanguages,
  createLanguage,
  deleteLanguage,
};
