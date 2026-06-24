import { API } from '../lib/api';
import { ApiEnvelope, Subcategory, SubcategoryPayload } from '../types';
import { getErrorMessage } from './apiHelpers';

async function listSubcategories(categoryId?: string) {
  try {
    const params = categoryId ? { category_id: categoryId } : {};
    const response = await API.get<ApiEnvelope<Subcategory[]>>('/v1/subcategories', { params });
    return response.data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load subcategories.'));
  }
}

async function getSubcategory(id: string) {
  try {
    const response = await API.get<ApiEnvelope<Subcategory>>(`/v1/subcategories/${id}`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load subcategory.'));
  }
}

async function createSubcategory(payload: SubcategoryPayload) {
  try {
    const response = await API.post<ApiEnvelope<Subcategory>>('/v1/subcategories/admin', payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to create subcategory.'));
  }
}

async function updateSubcategory(id: string, payload: SubcategoryPayload) {
  try {
    const response = await API.put<ApiEnvelope<Subcategory>>(`/v1/subcategories/admin/${id}`, payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to update subcategory.'));
  }
}

async function deleteSubcategory(id: string) {
  try {
    const response = await API.delete<ApiEnvelope<Subcategory>>(`/v1/subcategories/admin/${id}`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to delete subcategory.'));
  }
}

export const subcategoryService = {
  listSubcategories,
  getSubcategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
};
