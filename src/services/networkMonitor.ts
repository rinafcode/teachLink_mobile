import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

import logger from '../utils/logger';

export type ConnectionType = 'wifi' | 'cellular' | 'none' | 'unknown';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: ConnectionType;
}

const PROBE_URL = 'https://clients3.google.com/generate_204';
const PROBE_INTERVAL_MS = 30_000;
const PROBE_TIMEOUT_MS = 5_000;
const STORAGE_KEY = '@teachlink_network_status';

type Listener = (status: NetworkStatus) => void;

class NetworkMonitor {
  private status: NetworkStatus = {
    isConnected: false,
    isInternetReachable: false,
    type: 'unknown',
  };
  private listeners: Set<Listener> = new Set();
  private probeInterval: ReturnType<typeof setInterval> | null = null;
  private networkSubscription: (() => void) | null = null;
  private initialized = false;

  getStatus(): NetworkStatus {
    return { ...this.status };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn(this.status));
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // Load cached status
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.status = JSON.parse(raw);
      }
    } catch {
      // Ignore
    }

    // Subscribe to OS-level network changes
    const sub = Network.addNetworkStateListener(state => {
      this.status.isConnected = state.isConnected ?? false;
      this.status.type = state.type as ConnectionType;
      this.probe();
    });
    this.networkSubscription = () => sub.remove();

    // Start periodic probing
    this.probeInterval = setInterval(() => this.probe(), PROBE_INTERVAL_MS);

    // Initial probe
    await this.probe();
  }

  async probe(): Promise<NetworkStatus> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

      const response = await fetch(PROBE_URL, {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      this.status.isInternetReachable = response.ok || response.status === 204;
    } catch {
      this.status.isInternetReachable = false;
    }

    this.notify();
    await this.persist();

    return { ...this.status };
  }

  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.status));
    } catch {
      // Ignore
    }
  }

  async refresh(): Promise<NetworkStatus> {
    return this.probe();
  }

  destroy(): void {
    if (this.probeInterval) {
      clearInterval(this.probeInterval);
      this.probeInterval = null;
    }
    if (this.networkSubscription) {
      this.networkSubscription();
      this.networkSubscription = null;
    }
    this.listeners.clear();
    this.initialized = false;
  }
}

export const networkMonitor = new NetworkMonitor();
