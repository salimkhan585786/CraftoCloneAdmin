import { API } from '../lib/api';
import { ApiEnvelope, UpdateProfilePayload, UserProfile } from '../types';
import { getErrorMessage } from './apiHelpers';

async function getProfile() {
  try {
    const response = await API.get<ApiEnvelope<UserProfile>>('/v1/users/profile');
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load profile.'));
  }
}

async function updateProfile(payload: UpdateProfilePayload) {
  try {
    const response = await API.put<ApiEnvelope<UserProfile>>('/v1/users/profile', payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to update profile.'));
  }
}

async function deleteAccount() {
  try {
    await API.delete('/v1/users');
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to delete account.'));
  }
}

export const userService = {
  getProfile,
  updateProfile,
  deleteAccount,
};
