/**
 * useEspConnection Hook
 * 
 * Manages connection state with ESP32 device
 * - Auto-discovers device on first connect
 * - Monitors connection status
 * - Handles reconnection
 * - Provides loading and error states
 */

import espCommandService, { ConnectionTransport, DeviceState } from '@/services/espCommandService';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  deviceState: DeviceState | null;
  connectionType: ConnectionTransport;
}

export const useEspConnection = (autoConnect: boolean = true) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    deviceState: null,
    connectionType: 'none',
  });

  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Attempt to connect to device
   */
  const connect = useCallback(async () => {
    setConnectionState((prev) => ({
      ...prev,
      isConnecting: true,
      error: null,
    }));

    try {
      const connection = await espCommandService.connect();

      setConnectionState({
        isConnected: true,
        isConnecting: false,
        error: null,
        deviceState: connection.deviceState,
        connectionType: connection.type,
      });

      reconnectAttempts.current = 0;
      console.log('[useEspConnection] Device connected successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to connect to device';

      setConnectionState((prev) => ({
        ...prev,
        isConnecting: false,
        isConnected: false,
        error: errorMessage,
        connectionType: 'none',
      }));

      console.error('[useEspConnection] Connection failed:', errorMessage);

      // Retry with exponential backoff
      if (
        autoConnect &&
        reconnectAttempts.current < maxReconnectAttempts
      ) {
        reconnectAttempts.current++;
        const delayMs = Math.pow(2, reconnectAttempts.current) * 1000; // 2s, 4s, 8s
        console.log(
          `[useEspConnection] Retry attempt ${reconnectAttempts.current} in ${delayMs}ms`
        );

        reconnectTimeout.current = setTimeout(() => {
          connect();
        }, delayMs);
      }
    }
  }, [autoConnect]);

  /**
   * Check connection status periodically
   */
  const checkConnection = useCallback(async () => {
    if (!connectionState.isConnected) return;

    try {
      const isConnected = await espCommandService.isDeviceConnected();

      if (!isConnected && connectionState.isConnected) {
        setConnectionState((prev) => ({
          ...prev,
          isConnected: false,
          error: 'Device disconnected',
        }));

        // Attempt reconnection
        if (autoConnect) {
          reconnectAttempts.current = 0;
          setTimeout(() => connect(), 2000);
        }
      }
    } catch (error) {
      console.error('[useEspConnection] Health check failed:', error);
    }
  }, [connectionState.isConnected, autoConnect, connect]);

  /**
   * Disconnect from device
   */
  const disconnect = useCallback(async () => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    reconnectAttempts.current = 0;

    await espCommandService.disconnect();

    setConnectionState({
      isConnected: false,
      isConnecting: false,
      error: null,
      deviceState: null,
      connectionType: 'none',
    });

    console.log('[useEspConnection] Disconnected');
  }, []);

  /**
   * Force reconnection (clear cache and try again)
   */
  const reconnect = useCallback(async () => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    reconnectAttempts.current = 0;
    await espCommandService.clearCache();
    await connect();
  }, [connect]);

  /**
   * Initialize connection on mount
   */
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Set up periodic health check (every 10 seconds)
    const healthCheckInterval = setInterval(() => {
      checkConnection();
    }, 10000);

    return () => {
      clearInterval(healthCheckInterval);
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [autoConnect, connect, checkConnection]);

  return {
    ...connectionState,
    connect,
    disconnect,
    reconnect,
    checkConnection,
  };
};

export default useEspConnection;
