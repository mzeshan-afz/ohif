import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useCine } from '@ohif/ui-next';
import { Enums, eventTarget, cache } from '@cornerstonejs/core';
import { useAppConfig } from '@state';

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
    if (!enabledVPElement || !isCineEnabled) {
      return;
    }

    const { viewports } = viewportGridService.getState();
    const { displaySetInstanceUIDs } = viewports.get(viewportId);
    let frameRate = 16; // Always default to 1, ignore DICOM FrameRate tag
    let isPlaying = cines[viewportId]?.isPlaying || false;

    // Auto-play on new display set if not already playing
    if (!hasAutoPlayedRef.current) {
      isPlaying = true; // Force playing on load
      hasAutoPlayedRef.current = true;
    }

    displaySetInstanceUIDs.forEach(displaySetInstanceUID => {
      const displaySet = displaySetService.getDisplaySetByUID(displaySetInstanceUID);

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

    if (isPlaying) {
      cineService.setIsCineEnabled(isPlaying);
    }
    cineService.setCine({ id: viewportId, isPlaying, frameRate });
    setNewStackFrameRate(frameRate);
  }, [displaySetService, viewportId, viewportGridService, cines, isCineEnabled, enabledVPElement]);

  useEffect(() => {
    isMountedRef.current = true;
    hasAutoPlayedRef.current = false; // Reset on mount

    // Enable cine player on mount
    cineService.setIsCineEnabled(true);

    newDisplaySetHandler();

    return () => {
      isMountedRef.current = false;
      hasAutoPlayedRef.current = false;
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

  // Always render the cine player - remove the conditional return
  const cine = cines?.[viewportId] || { isPlaying: false, frameRate: 16 };
  const isPlaying = cine?.isPlaying || false;

  return (
    <RenderCinePlayer
      viewportId={viewportId}
      cineService={cineService}
      newStackFrameRate={newStackFrameRate}
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
