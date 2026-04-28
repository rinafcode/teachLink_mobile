import { useState, useCallback } from 'react';

export const useCamera = () => {
  return {
    hasPermission: false,
    capturedImage: null,
    isLoading: false,
    takePicture: useCallback(async () => null, []),
    pickFromLibrary: useCallback(async () => null, []),
    resetCapturedImage: useCallback(() => {}, []),
    requestPermissions: useCallback(async () => false, []),
  };
};
