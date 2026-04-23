import { API } from '../lib/api';
import { AdminCategory, ApiEnvelope, CategoryPayload } from '../types';
import { getErrorMessage } from './apiHelpers';

async function listCategories() {
  try {
    const response = await API.get<ApiEnvelope<AdminCategory[]>>('/v1/categories');
    return response.data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load categories.'));
  }
}

async function createCategory(payload: CategoryPayload) {
  try {
    const response = await API.post<ApiEnvelope<AdminCategory>>('/v1/categories/admin', payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to create category.'));
  }
}

async function updateCategory(id: string, payload: CategoryPayload) {
  try {
    const response = await API.put<ApiEnvelope<AdminCategory>>(`/v1/categories/admin/${id}`, payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to update category.'));
  }
}

async function deleteCategory(id: string) {
  try {
    const response = await API.delete<ApiEnvelope<AdminCategory>>(`/v1/categories/admin/${id}`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to delete category.'));
  }
}

export const categoryService = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
