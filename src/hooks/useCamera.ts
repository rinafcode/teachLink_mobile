import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { appLogger } from '../utils/logger';

export enum CameraFallbackType {
  FULL_CAMERA = 'fullCamera',
  LIBRARY_ONLY = 'libraryOnly',
  UNAVAILABLE = 'unavailable',
}

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
  /** Current fallback mode (full camera, library only, or unavailable) */
  fallbackMode: CameraFallbackType;
  /** Whether the camera is in degraded/fallback mode */
  isDegraded: boolean;
  /** User-friendly message about the current state */
  statusMessage: string;
}

/**
 * Hook for handling camera and image picker functionality with graceful degradation
 * Manages permissions, captures photos, selects from gallery, and provides fallbacks
 *
 * Graceful Degradation:
 * - If camera permission denied: Falls back to library-only mode
 * - If library permission denied: Shows message about using existing photos
 * - If both unavailable: Shows user-friendly degradation message
 */
export const useCamera = (): UseCameraReturn => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fallbackMode, setFallbackMode] = useState<CameraFallbackType>(CameraFallbackType.FULL_CAMERA);
  const [statusMessage, setStatusMessage] = useState<string>('Camera ready');

  const degradationStore = useDegradationStore();

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

      // Update feature capability and degradation store
      if (granted) {
        degradationStore.setFeatureStatus(FeatureType.CAMERA, FeatureStatus.AVAILABLE);
        setFallbackMode(CameraFallbackType.FULL_CAMERA);
        setStatusMessage('Camera ready');
      } else if (mediaLibraryStatus.granted) {
        // Partial: can use library but not camera
        degradationStore.setFeatureStatus(FeatureType.CAMERA, FeatureStatus.DEGRADED);
        setFallbackMode(CameraFallbackType.LIBRARY_ONLY);
        setStatusMessage('Camera unavailable - using photo library instead');

        degradationStore.addNotification({
          feature: FeatureType.CAMERA,
          status: FeatureStatus.DEGRADED,
          message: 'Camera permission denied. You can still select photos from your library.',
        });
      } else {
        // Both unavailable
        degradationStore.setFeatureStatus(FeatureType.CAMERA, FeatureStatus.PERMISSION_DENIED);
        setFallbackMode(CameraFallbackType.UNAVAILABLE);
        setStatusMessage('Camera and photo library access denied');

        degradationStore.addNotification({
          feature: FeatureType.CAMERA,
          status: FeatureStatus.PERMISSION_DENIED,
          message: 'Camera and photo library permissions were denied. Grant them in Settings to use this feature.',
        });
      }

      return granted || mediaLibraryStatus.granted;
    } catch (error) {
      appLogger.errorSync('[useCamera] Error requesting permissions', error instanceof Error ? error : new Error(String(error)));
      degradationStore.setFeatureStatus(FeatureType.CAMERA, FeatureStatus.UNAVAILABLE);
      setFallbackMode(CameraFallbackType.UNAVAILABLE);
      setStatusMessage('Camera initialization failed');
      return false;
    }
  }, [degradationStore]);

  /**
   * Take a picture using the device camera
   * Allows editing to crop/scale the image
   * Falls back to library if camera unavailable
   */
  const takePicture = useCallback(async (): Promise<string | null> => {
    // Check if camera is available
    const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
    if (!cameraStatus.granted) {
      // Camera not available, try library as fallback
      appLogger.infoSync('[useCamera] Camera permission not available, falling back to library');
      return pickFromLibrary();
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

      // If camera operation fails, try falling back to library
      try {
        appLogger.infoSync('[useCamera] Camera operation failed, attempting library fallback');
        return await pickFromLibrary();
      } catch (fallbackError) {
        appLogger.errorSync('[useCamera] Fallback to library also failed', fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)));
        degradationStore.addNotification({
          feature: FeatureType.CAMERA,
          status: FeatureStatus.UNAVAILABLE,
          message: 'Unable to access camera or photo library. Please check your permissions.',
        });
        return null;
      }
    } finally {
      setIsLoading(false);
    }
  }, [pickFromLibrary, degradationStore]);

  /**
   * Pick an image from the photo library
   * Allows editing to crop/scale the image
   */
  const pickFromLibrary = useCallback(async (): Promise<string | null> => {
    const mediaLibraryStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!mediaLibraryStatus.granted) {
      // Request permission
      const newStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!newStatus.granted) {
        degradationStore.addNotification({
          feature: FeatureType.CAMERA,
          status: FeatureStatus.PERMISSION_DENIED,
          message: 'Photo library permission denied. Grant it in Settings to select photos.',
        });
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
      degradationStore.addNotification({
        feature: FeatureType.CAMERA,
        status: FeatureStatus.UNAVAILABLE,
        message: 'Failed to access your photo library. Please try again.',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [degradationStore]);

  /**
   * Reset the captured image state
   * Useful when closing the camera modal or confirming selection
   */
  const resetCapturedImage = useCallback((): void => {
    setCapturedImage(null);
  }, []);

  /**
   * Check permissions on mount and detect degradation mode
   * This ensures the hook reflects the current permission state
   */
  useEffect(() => {
    const checkPermissions = async () => {
      const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
      const mediaLibraryStatus = await ImagePicker.getMediaLibraryPermissionsAsync();

      const cameraGranted = cameraStatus.granted;
      const libraryGranted = mediaLibraryStatus.granted || Platform.OS === 'android';

      if (cameraGranted && libraryGranted) {
        setHasPermission(true);
        setFallbackMode(CameraFallbackType.FULL_CAMERA);
        setStatusMessage('Camera ready');
        degradationStore.setFeatureStatus(FeatureType.CAMERA, FeatureStatus.AVAILABLE);
      } else if (libraryGranted) {
        setHasPermission(false);
        setFallbackMode(CameraFallbackType.LIBRARY_ONLY);
        setStatusMessage('Camera unavailable - using photo library instead');
        degradationStore.setFeatureStatus(FeatureType.CAMERA, FeatureStatus.DEGRADED);
      } else {
        setHasPermission(false);
        setFallbackMode(CameraFallbackType.UNAVAILABLE);
        setStatusMessage('Camera and photo library access denied');
        degradationStore.setFeatureStatus(FeatureType.CAMERA, FeatureStatus.PERMISSION_DENIED);
      }
    };
    checkPermissions();
  }, [degradationStore]);

  return {
    hasPermission,
    capturedImage,
    isLoading,
    takePicture,
    pickFromLibrary,
    resetCapturedImage,
    requestPermissions,
    fallbackMode,
    isDegraded: fallbackMode !== CameraFallbackType.FULL_CAMERA,
    statusMessage,
  };
};
