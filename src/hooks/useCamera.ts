import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';

interface CameraOptions {
  aspect?: [number, number];
  quality?: number;
}

export const useCamera = (options: CameraOptions = {}) => {
  const { aspect = [1, 1], quality = 0.8 } = options;
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const { status: cameraStatus } =
      await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    const granted =
      cameraStatus === 'granted' && mediaStatus === 'granted';
    setHasPermission(granted);
    return granted;
  }, []);

  const takePicture = useCallback(async (): Promise<string | null> => {
    setIsLoading(true);
    try {
      if (hasPermission !== true) {
        const granted = await requestPermissions();
        if (!granted) return null;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect,
        quality,
      });
      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setCapturedImage(uri);
        return uri;
      }
    } catch (error) {
      console.error('[useCamera] takePicture error:', error);
    } finally {
      setIsLoading(false);
    }
    return null;
  }, [hasPermission, requestPermissions, aspect, quality]);

  const pickFromLibrary = useCallback(async (): Promise<string | null> => {
    setIsLoading(true);
    try {
      if (hasPermission !== true) {
        const granted = await requestPermissions();
        if (!granted) return null;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect,
        quality,
      });
      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setCapturedImage(uri);
        return uri;
      }
    } catch (error) {
      console.error('[useCamera] pickFromLibrary error:', error);
    } finally {
      setIsLoading(false);
    }
    return null;
  }, [hasPermission, requestPermissions, aspect, quality]);

  const resetCapturedImage = useCallback(() => {
    setCapturedImage(null);
  }, []);

  return {
    hasPermission,
    capturedImage,
    isLoading,
    takePicture,
    pickFromLibrary,
    resetCapturedImage,
    requestPermissions,
  };
};
