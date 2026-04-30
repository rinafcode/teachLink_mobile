import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { appLogger } from '../utils/logger';

interface UseCameraReturn {
  /** Whether camera permission has been granted */
  hasPermission: boolean;
  /** The URI of the captured/selected image */
  capturedImage: string | null;
  /** Whether a camera operation is in progress */
  isLoading: boolean;
  /** Function to take a picture with the camera */
  takePicture: () => Promise<string | null>;
  /** Function to pick an image from the photo library */
  pickFromLibrary: () => Promise<string | null>;
  /** Reset the captured image state */
  resetCapturedImage: () => void;
  /** Request camera and media library permissions */
  requestPermissions: () => Promise<boolean>;
}

/**
 * Hook for handling camera and image picker functionality
 * Manages permissions, captures photos, and selects from gallery
 */
export const useCamera = (): UseCameraReturn => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /**
   * Request camera and media library permissions
   * On iOS, both permissions are required; on Android, camera permission suffices
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      // Request camera permission
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      // Request media library permission (needed for picking from gallery)
      const mediaLibraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();

      const granted =
        cameraStatus.granted && (Platform.OS === 'android' || mediaLibraryStatus.granted);

      setHasPermission(granted);
      return granted;
    } catch (error) {
      appLogger.errorSync('[useCamera] Error requesting permissions', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }, []);

  /**
   * Take a picture using the device camera
   * Allows editing to crop/scale the image
   */
  const takePicture = useCallback(async (): Promise<string | null> => {
    if (!hasPermission) {
      const permissionGranted = await requestPermissions();
      if (!permissionGranted) {
        return null;
      }
    }

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1], // Square aspect ratio for avatars
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setCapturedImage(uri);
        return uri;
      }
      return null;
    } catch (error) {
      appLogger.errorSync('[useCamera] Error taking picture', error instanceof Error ? error : new Error(String(error)));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [hasPermission, requestPermissions]);

  /**
   * Pick an image from the photo library
   * Allows editing to crop/scale the image
   */
  const pickFromLibrary = useCallback(async (): Promise<string | null> => {
    if (!hasPermission) {
      const permissionGranted = await requestPermissions();
      if (!permissionGranted) {
        return null;
      }
    }

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1], // Square aspect ratio for avatars
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setCapturedImage(uri);
        return uri;
      }
      return null;
    } catch (error) {
      appLogger.errorSync('[useCamera] Error picking from library', error instanceof Error ? error : new Error(String(error)));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [hasPermission, requestPermissions]);

  /**
   * Reset the captured image state
   * Useful when closing the camera modal or confirming selection
   */
  const resetCapturedImage = useCallback((): void => {
    setCapturedImage(null);
  }, []);

  /**
   * Check permissions on mount
   * This ensures the hook reflects the current permission state
   */
  useEffect(() => {
    const checkPermissions = async () => {
      const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
      const mediaLibraryStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
      const granted =
        cameraStatus.granted && (Platform.OS === 'android' || mediaLibraryStatus.granted);
      setHasPermission(granted);
    };
    checkPermissions();
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
