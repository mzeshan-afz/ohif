import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useCine } from '@ohif/ui-next';
import { Enums, eventTarget, cache } from '@cornerstonejs/core';
import { useAppConfig } from '@state';

/**
 * STRICT & SAFE true cine detection
 */
function isTrueCineSeries(displaySet: any): boolean {
  if (!displaySet) return false;

  if (displaySet.isMultiFrame === true) return true;
  if (displaySet.isDynamicVolume === true) return true;

  const instances = displaySet.instances || [];
  const numImageFrames = displaySet.numImageFrames || 0;

  if (instances.length === 1 && numImageFrames > 1) {
    const instance = instances[0];
    if (instance && (instance.NumberOfFrames > 1 || numImageFrames > 1)) {
      return true;
    }
  }

  return false;
}

function getVideoType(displaySet: any): 'grayscale' | 'color' {
  if (!displaySet) return 'grayscale';

  const instance = displaySet.instances?.[0];
  if (!instance) return 'grayscale';

  // In OHIF, real DICOM values are usually inside metadata
  const metadata = instance.metadata || instance;

  const samplesPerPixel =
    metadata?.SamplesPerPixel ??
    metadata?.samplesPerPixel ??
    1;
  console.log('samplesPerPixel', samplesPerPixel);

  const photometricInterpretation = (
    metadata?.PhotometricInterpretation ??
    metadata?.photometricInterpretation ??
    ''
  )
    .toString()
    .toUpperCase();

  // Debug once if needed
  // console.log('VIDEO TYPE DEBUG', { samplesPerPixel, photometricInterpretation });

  // True color detection
  if (Number(samplesPerPixel) === 3) return 'color';

  if (
    photometricInterpretation.includes('RGB') ||
    photometricInterpretation.includes('YBR')
  ) {
    return 'color';
  }

  return 'grayscale';
}

function WrappedCinePlayer({ enabledVPElement, viewportId, servicesManager }: any) {
  const { customizationService, displaySetService, viewportGridService } =
    servicesManager.services;

  const [{ isCineEnabled, cines }, cineService] = useCine();
  const [newStackFrameRate, setNewStackFrameRate] = useState(16);
  const [dynamicInfo, setDynamicInfo] = useState<any>(null);

  const isMountedRef = useRef(false);
  const hasAutoPlayedRef = useRef(false);
  const previousDisplaySetUIDsRef = useRef<string[]>([]);

  /**
   * SAFE cine playback handler
   */
  const cineHandler = useCallback(() => {
    if (!enabledVPElement) return;

    const currentCine = cines?.[viewportId];
    if (!currentCine) return;

    const { isPlaying = false, frameRate = 16 } = currentCine;
    const validFrameRate = Math.max(frameRate, 1);

    if (isPlaying) {
      // Delay ensures cornerstone stack is ready
      setTimeout(() => {
        try {
          cineService.stopClip(enabledVPElement, { viewportId });

          cineService.playClip(enabledVPElement, {
            framesPerSecond: validFrameRate,
            viewportId,
            loop: true,
          });
        } catch (e) {
          console.warn('Cine playback failed:', e);
          cineService.setCine({ id: viewportId, isPlaying: false });
        }
      }, 50);
    } else {
      cineService.stopClip(enabledVPElement, { viewportId });
    }
  }, [cines, viewportId, enabledVPElement, cineService]);

  /**
   * Detect new display set & configure cine safely
   */
  const newDisplaySetHandler = useCallback(() => {
    if (!enabledVPElement) return;

    const { viewports } = viewportGridService.getState();
    const { displaySetInstanceUIDs } = viewports.get(viewportId) || {
      displaySetInstanceUIDs: [],
    };

    const displaySetChanged =
      previousDisplaySetUIDsRef.current.length !== displaySetInstanceUIDs.length ||
      previousDisplaySetUIDsRef.current.some((uid, i) => uid !== displaySetInstanceUIDs[i]);

    if (!displaySetChanged) return;

    hasAutoPlayedRef.current = false;
    previousDisplaySetUIDsRef.current = [...displaySetInstanceUIDs];

    let frameRate: number | undefined = cines?.[viewportId]?.frameRate;
    let isPlaying = false;

    let hasTrueCineSeries = false;
    let detectedVideoType: 'grayscale' | 'color' = 'grayscale';

    displaySetInstanceUIDs.forEach(uid => {
      const displaySet = displaySetService.getDisplaySetByUID(uid);
      if (!displaySet) return;

      const isCine = isTrueCineSeries(displaySet);

      if (isCine) {
        hasTrueCineSeries = true;

        if (detectedVideoType === 'grayscale') {
          detectedVideoType = getVideoType(displaySet);
          console.log('detectedVideoType', detectedVideoType);
        }

        if (!hasAutoPlayedRef.current) {
          isPlaying = true;
          hasAutoPlayedRef.current = true;
        }
      }

      if (displaySet.isDynamicVolume) {
        const { dynamicVolumeInfo } = displaySet;
        setDynamicInfo({
          volumeId: displaySet.displaySetInstanceUID,
          dimensionGroupNumber: dynamicVolumeInfo.dimensionGroupNumber || 16,
          numDimensionGroups: dynamicVolumeInfo.timePoints.length,
          label: dynamicVolumeInfo.splittingTag,
        });
      }
    });

    if (hasTrueCineSeries) {
      if (frameRate == null) {
        frameRate = detectedVideoType === 'grayscale' ? 58 : 19;
      }

      // IMPORTANT: enable first, then set playing
      cineService.setIsCineEnabled(true);

      cineService.setCine({
        id: viewportId,
        isPlaying,
        frameRate,
      });

      setNewStackFrameRate(frameRate);
    } else {
      cineService.setCine({ id: viewportId, isPlaying: false, frameRate: frameRate || 16 });
      cineService.setIsCineEnabled(false);
      setNewStackFrameRate(frameRate || 16);
    }
  }, [displaySetService, viewportGridService, viewportId, cines, cineService, enabledVPElement]);

  /** mount */
  useEffect(() => {
    isMountedRef.current = true;
    newDisplaySetHandler();

    return () => {
      isMountedRef.current = false;
      cineService.stopClip(enabledVPElement, { viewportId });
    };
  }, [newDisplaySetHandler]);

  /** react to cine state */
  useEffect(() => {
    if (!enabledVPElement) return;
    if (!cines?.[viewportId]) return;

    cineHandler();
  }, [cineHandler, enabledVPElement, cines, viewportId]);

  /** listen for viewport changes */
  useEffect(() => {
    if (!enabledVPElement) return;

    enabledVPElement.addEventListener(Enums.Events.VIEWPORT_NEW_IMAGE_SET, newDisplaySetHandler);
    enabledVPElement.addEventListener(Enums.Events.VOLUME_VIEWPORT_NEW_VOLUME, newDisplaySetHandler);

    return () => {
      enabledVPElement.removeEventListener(
        Enums.Events.VIEWPORT_NEW_IMAGE_SET,
        newDisplaySetHandler
      );
      enabledVPElement.removeEventListener(
        Enums.Events.VOLUME_VIEWPORT_NEW_VOLUME,
        newDisplaySetHandler
      );
    };
  }, [enabledVPElement, newDisplaySetHandler]);

  /** hide cine UI if not real cine */
  const { viewports } = viewportGridService.getState();
  const { displaySetInstanceUIDs } = viewports.get(viewportId) || { displaySetInstanceUIDs: [] };

  const hasTrueCineSeries = displaySetInstanceUIDs.some(uid => {
    const ds = displaySetService.getDisplaySetByUID(uid);
    return isTrueCineSeries(ds);
  });

  if (!hasTrueCineSeries) return null;

  const cine = cines?.[viewportId] || { isPlaying: false, frameRate: 16 };

  const CinePlayerComponent = customizationService.getCustomization('cinePlayer');

  return (
    <CinePlayerComponent
      className="absolute left-1/2 bottom-3 -translate-x-1/2"
      frameRate={cine.frameRate || newStackFrameRate}
      isPlaying={cine.isPlaying || false}
      onPlayPauseChange={(playing: boolean) => {
        cineService.setCine({ id: viewportId, isPlaying: playing });
      }}
      onFrameRateChange={(frameRate: number) => {
        cineService.setCine({ id: viewportId, frameRate });
      }}
      dynamicInfo={dynamicInfo}
    />
  );
}

export default WrappedCinePlayer;
