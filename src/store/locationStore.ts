import { create } from 'zustand';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface LocationState {
  coordinates: Coordinates | null;
  permissionGranted: boolean;
  setCoordinates: (coords: Coordinates) => void;
  setPermissionGranted: (granted: boolean) => void;
  clearLocation: () => void;
}

export const useLocationStore = create<LocationState>(set => ({
  coordinates: null,
  permissionGranted: false,
  setCoordinates: coordinates => set({ coordinates }),
  setPermissionGranted: permissionGranted => set({ permissionGranted }),
  clearLocation: () => set({ coordinates: null, permissionGranted: false }),
}));
