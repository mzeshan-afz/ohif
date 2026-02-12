import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useCine } from '@ohif/ui-next';
import { Enums, eventTarget, cache } from '@cornerstonejs/core';
import { useAppConfig } from '@state';

/**
 * Determines if a display set is a true cine/multi-frame video series
 * vs a regular image series with many instances
 *
 * True cine series have:
 * - isMultiFrame === true (single instance with NumberOfFrames > 1)
 * - isDynamicVolume === true (4D volume data)
 * - Single instance with multiple frames (numImageFrames > 1 and instances.length === 1)
 *
 * Regular image series have:
 * - Multiple instances, each with NumberOfFrames = 1
 * - numImageFrames equals instances.length (not NumberOfFrames)
 */
function isTrueCineSeries(displaySet) {
  if (!displaySet) {
    return false;
  }

  // Check for multi-frame instance (true cine)
  if (displaySet.isMultiFrame === true) {
    return true;
  }

  // Check for dynamic volume (4D cine)
  if (displaySet.isDynamicVolume === true) {
    return true;
  }

  // Check if it's a single instance with multiple frames
  // For multi-frame instances, numImageFrames is set to NumberOfFrames
  // For regular series, numImageFrames is set to instances.length
  const instances = displaySet.instances || [];
  const numImageFrames = displaySet.numImageFrames || 0;

  // If single instance with multiple frames, it's a true cine
  if (instances.length === 1 && numImageFrames > 1) {
    // Additional check: verify the instance actually has NumberOfFrames > 1
    const instance = instances[0];
    if (instance && (instance.NumberOfFrames > 1 || numImageFrames > 1)) {
      return true;
    }
  }

  // Otherwise, it's a regular image series (many instances, each with 1 frame)
  return false;
}

function WrappedCinePlayer({
  enabledVPElement,
  viewportId,
  servicesManager,
}: withAppTypes<{
  enabledVPElement: HTMLElement;
  viewportId: string;
}>) {
  const { customizationService, displaySetService, viewportGridService } = servicesManager.services;
  const [{ isCineEnabled, cines }, cineService] = useCine();
  const [newStackFrameRate, setNewStackFrameRate] = useState(16);
  const [dynamicInfo, setDynamicInfo] = useState(null);
  const [appConfig] = useAppConfig();
  const isMountedRef = useRef(null);
  const hasAutoPlayedRef = useRef(false); // Track if auto-play has been triggered
  const previousDisplaySetUIDsRef = useRef<string[]>([]); // Track previous display set UIDs

  const cineHandler = () => {
    if (!cines?.[viewportId] || !enabledVPElement) {
      return;
    }

    const { isPlaying = false, frameRate = 16 } = cines[viewportId];
    const validFrameRate = Math.max(frameRate, 1);

    if (isPlaying) {
      // Stop any existing clip first to ensure new frameRate is applied
      cineService.stopClip(enabledVPElement, { viewportId });
      // Start playback with loop enabled and current frameRate
      cineService.playClip(enabledVPElement, {
        framesPerSecond: validFrameRate,
        viewportId,
        loop: true, // Enable looping
      });
    } else {
      cineService.stopClip(enabledVPElement, { viewportId });
    }
  };

  const newDisplaySetHandler = useCallback(() => {
    if (!enabledVPElement) {
      return;
    }

    const { viewports } = viewportGridService.getState();
    const { displaySetInstanceUIDs } = viewports.get(viewportId);
    // Preserve user's custom frame rate if set, otherwise default to 16
    let frameRate = cines[viewportId]?.frameRate || 16;
    let isPlaying = cines[viewportId]?.isPlaying || false;

    // Check if display set has changed (new series loaded)
    const displaySetChanged =
      previousDisplaySetUIDsRef.current.length !== displaySetInstanceUIDs.length ||
      previousDisplaySetUIDsRef.current.some((uid, index) => uid !== displaySetInstanceUIDs[index]);

    // If display set changed, reset auto-play flag to allow auto-play for new series
    if (displaySetChanged) {
      hasAutoPlayedRef.current = false;
      previousDisplaySetUIDsRef.current = [...displaySetInstanceUIDs];
    }

    // Check if any display set is a true cine series
    let hasTrueCineSeries = false;

    displaySetInstanceUIDs.forEach(displaySetInstanceUID => {
      const displaySet = displaySetService.getDisplaySetByUID(displaySetInstanceUID);

      if (!displaySet) {
        return;
      }

      // Check if this is a true cine series
      const isCine = isTrueCineSeries(displaySet);
      if (isCine) {
        hasTrueCineSeries = true;
      }

      // Only auto-play true cine series, not regular image series
      if (isCine && !hasAutoPlayedRef.current) {
        isPlaying = true; // Force playing on load for true cine
        hasAutoPlayedRef.current = true;
      }

      // Commented out to always use default frameRate of 1 instead of reading from DICOM tag
      // if (displaySet.FrameRate) {
      //   // displaySet.FrameRate corresponds to DICOM tag (0018,1063) which is defined as the the frame time in milliseconds
      //   // So a bit of math to get the actual frame rate.
      //   frameRate = Math.round(1000 / displaySet.FrameRate);
      //   isPlaying ||= !!appConfig.autoPlayCine;
      // }

      // check if the displaySet is dynamic and set the dynamic info
      if (displaySet.isDynamicVolume) {
        const { dynamicVolumeInfo } = displaySet;
        const numDimensionGroups = dynamicVolumeInfo.timePoints.length;
        const label = dynamicVolumeInfo.splittingTag;
        const dimensionGroupNumber = dynamicVolumeInfo.dimensionGroupNumber || 16;
        setDynamicInfo({
          volumeId: displaySet.displaySetInstanceUID,
          dimensionGroupNumber,
          numDimensionGroups,
          label,
        });
      } else {
        setDynamicInfo(null);
      }
    });

    // Only enable cine and set playing state for true cine series
    if (hasTrueCineSeries) {
      if (isPlaying) {
        cineService.setIsCineEnabled(isPlaying);
      }
      // Preserve the frame rate when setting cine state
      cineService.setCine({ id: viewportId, isPlaying, frameRate });
      setNewStackFrameRate(frameRate);
    } else {
      // For regular image series, disable cine and stop playing
      cineService.setCine({ id: viewportId, isPlaying: false, frameRate });
      cineService.setIsCineEnabled(false);
      setNewStackFrameRate(frameRate);
    }
  }, [displaySetService, viewportId, viewportGridService, cines, isCineEnabled, enabledVPElement, cineService]);

  useEffect(() => {
    isMountedRef.current = true;
    hasAutoPlayedRef.current = false; // Reset on mount
    previousDisplaySetUIDsRef.current = []; // Reset on mount

    // Enable cine player on mount
    cineService.setIsCineEnabled(true);

    newDisplaySetHandler();

    return () => {
      isMountedRef.current = false;
      hasAutoPlayedRef.current = false;
      previousDisplaySetUIDsRef.current = [];
    };
  }, [isCineEnabled, newDisplaySetHandler]);

  useEffect(() => {
    if (!isCineEnabled) {
      return;
    }

    cineHandler();
  }, [isCineEnabled, cineHandler, enabledVPElement]);

  /**
   * Use effect for handling new display set
   */
  useEffect(() => {
    if (!enabledVPElement) {
      return;
    }

    enabledVPElement.addEventListener(Enums.Events.VIEWPORT_NEW_IMAGE_SET, newDisplaySetHandler);
    // this doesn't makes sense that we are listening to this event on viewport element
    enabledVPElement.addEventListener(
      Enums.Events.VOLUME_VIEWPORT_NEW_VOLUME,
      newDisplaySetHandler
    );

    return () => {
      cineService.setCine({ id: viewportId, isPlaying: false });

      enabledVPElement.removeEventListener(
        Enums.Events.VIEWPORT_NEW_IMAGE_SET,
        newDisplaySetHandler
      );
      enabledVPElement.removeEventListener(
        Enums.Events.VOLUME_VIEWPORT_NEW_VOLUME,
        newDisplaySetHandler
      );
    };
  }, [enabledVPElement, newDisplaySetHandler, viewportId]);

  useEffect(() => {
    if (!cines || !cines[viewportId] || !enabledVPElement || !isMountedRef.current) {
      return;
    }

    cineHandler();

    return () => {
      cineService.stopClip(enabledVPElement, { viewportId });
    };
  }, [cines, viewportId, cineService, enabledVPElement, cineHandler]);

  // Check if current display sets are true cine series
  const { viewports } = viewportGridService.getState();
  const { displaySetInstanceUIDs } = viewports.get(viewportId) || { displaySetInstanceUIDs: [] };
  const hasTrueCineSeries = displaySetInstanceUIDs.some(displaySetInstanceUID => {
    const displaySet = displaySetService.getDisplaySetByUID(displaySetInstanceUID);
    return isTrueCineSeries(displaySet);
  });

  // Only render cine player for true cine series
  if (!hasTrueCineSeries) {
    return null;
  }

  const cine = cines?.[viewportId] || { isPlaying: false, frameRate: 16 };
  const isPlaying = cine?.isPlaying || false;
  // Use frame rate from cine state to ensure it's always in sync with user's setting
  const currentFrameRate = cine?.frameRate || newStackFrameRate;

  return (
    <RenderCinePlayer
      viewportId={viewportId}
      cineService={cineService}
      newStackFrameRate={currentFrameRate}
      isPlaying={isPlaying}
      dynamicInfo={dynamicInfo}
      customizationService={customizationService}
      enabledVPElement={enabledVPElement}
    />
  );
}

function RenderCinePlayer({
  viewportId,
  cineService,
  newStackFrameRate,
  isPlaying,
  dynamicInfo: dynamicInfoProp,
  customizationService,
  enabledVPElement,
}) {
  const CinePlayerComponent = customizationService.getCustomization('cinePlayer');

  const [dynamicInfo, setDynamicInfo] = useState(dynamicInfoProp);

  useEffect(() => {
    setDynamicInfo(dynamicInfoProp);
  }, [dynamicInfoProp]);

  /**
   * Use effect for handling 4D time index changed
   */
  useEffect(() => {
    if (!dynamicInfo) {
      return;
    }

    const handleDimensionGroupChange = evt => {
      const { volumeId, dimensionGroupNumber, numDimensionGroups, splittingTag } = evt.detail;
      setDynamicInfo({ volumeId, dimensionGroupNumber, numDimensionGroups, label: splittingTag });
    };

    eventTarget.addEventListener(
      Enums.Events.DYNAMIC_VOLUME_DIMENSION_GROUP_CHANGED,
      handleDimensionGroupChange
    );

    return () => {
      eventTarget.removeEventListener(
        Enums.Events.DYNAMIC_VOLUME_DIMENSION_GROUP_CHANGED,
        handleDimensionGroupChange
      );
    };
  }, [dynamicInfo]);

  useEffect(() => {
    if (!dynamicInfo) {
      return;
    }

    const { volumeId, dimensionGroupNumber, numDimensionGroups, splittingTag } = dynamicInfo || {};
    const volume = cache.getVolume(volumeId, true);
    volume.dimensionGroupNumber = dimensionGroupNumber;

    setDynamicInfo({ volumeId, dimensionGroupNumber, numDimensionGroups, label: splittingTag });
  }, []);

  const updateDynamicInfo = useCallback(props => {
    const { volumeId, dimensionGroupNumber } = props;
    const volume = cache.getVolume(volumeId, true);
    volume.dimensionGroupNumber = dimensionGroupNumber;
  }, []);

  return (
    <CinePlayerComponent
      className="absolute left-1/2 bottom-3 -translate-x-1/2"
      frameRate={newStackFrameRate}
      isPlaying={isPlaying}
      onClose={() => {
        // Stop the clip but keep the player visible
        cineService.setCine({
          id: viewportId,
          isPlaying: false,
        });
        // Don't disable cine - keep player visible
        // cineService.setIsCineEnabled(false);
        // cineService.setViewportCineClosed(viewportId);
      }}
      onPlayPauseChange={isPlaying => {
        cineService.setCine({
          id: viewportId,
          isPlaying,
        });
      }}
      onFrameRateChange={frameRate => {
        const wasPlaying = isPlaying;
        // Update frameRate in state
        cineService.setCine({
          id: viewportId,
          frameRate,
        });
        // If playing, restart with new frameRate
        if (wasPlaying && enabledVPElement) {
          setTimeout(() => {
            cineService.stopClip(enabledVPElement, { viewportId });
            cineService.playClip(enabledVPElement, {
              framesPerSecond: Math.max(frameRate, 1),
              viewportId,
              loop: true,
            });
          }, 0);
        }
      }}
      dynamicInfo={dynamicInfo}
      updateDynamicInfo={updateDynamicInfo}
    />
  );
}

export default WrappedCinePlayer;
