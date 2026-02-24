import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Enums, VolumeViewport3D, utilities as csUtils } from '@cornerstonejs/core';
import { ImageScrollbar } from '@ohif/ui-next';

function CornerstoneImageScrollbar({
  viewportData,
  viewportId,
  element,
  imageSliceData,
  setImageSliceData,
  scrollbarHeight,
  servicesManager,
}: withAppTypes<{
  element: HTMLElement;
}>) {
  const { cineService, cornerstoneViewportService } = servicesManager.services;

  const onImageScrollbarChange = (imageIndex, viewportId) => {
    const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

    if (!viewport) {
      console.debug('Viewport not found, skipping scrollbar change');
      return;
    }

    // Check if viewport has been destroyed
    if (typeof (viewport as any).hasBeenDestroyed === 'function' && (viewport as any).hasBeenDestroyed()) {
      console.debug('Viewport has been destroyed, skipping scrollbar change');
      return;
    }

    const { isCineEnabled } = cineService.getState();

    if (isCineEnabled) {
      // on image scrollbar change, stop the CINE if it is playing
      cineService.stopClip(element, { viewportId });
      cineService.setCine({ id: viewportId, isPlaying: false });
    }

    try {
      csUtils.jumpToSlice(viewport.element, {
        imageIndex,
        debounceLoading: true,
      });
    } catch (error) {
      if (error?.message?.includes('destroyed') || error?.message?.includes('no longer usable')) {
        console.debug('Viewport was destroyed during scrollbar change');
        return;
      }
      throw error;
    }
  };

  useEffect(() => {
    if (!viewportData) {
      return;
    }

    const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

    if (!viewport || viewport instanceof VolumeViewport3D) {
      return;
    }

    try {
      // Check if viewport has been destroyed before accessing it
      if (typeof (viewport as any).hasBeenDestroyed === 'function' && (viewport as any).hasBeenDestroyed()) {
        console.debug('Viewport has been destroyed, skipping image slice data update');
        return;
      }

      const imageIndex = viewport.getCurrentImageIdIndex();
      const numberOfSlices = viewport.getNumberOfSlices();

      setImageSliceData({
        imageIndex: imageIndex,
        numberOfSlices,
      });
    } catch (error) {
      if (error?.message?.includes('destroyed') || error?.message?.includes('no longer usable')) {
        console.debug('Viewport was destroyed during image slice data update');
        return;
      }
      console.warn(error);
    }
  }, [viewportId, viewportData]);

  useEffect(() => {
    if (!viewportData) {
      return;
    }
    const { viewportType } = viewportData;
    const eventId =
      (viewportType === Enums.ViewportType.STACK && Enums.Events.STACK_NEW_IMAGE) ||
      (viewportType === Enums.ViewportType.ORTHOGRAPHIC && Enums.Events.VOLUME_NEW_IMAGE) ||
      Enums.Events.IMAGE_RENDERED;

    const updateIndex = event => {
      const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
      if (!viewport || viewport instanceof VolumeViewport3D) {
        return;
      }

      // Check if viewport has been destroyed
      if (typeof (viewport as any).hasBeenDestroyed === 'function' && (viewport as any).hasBeenDestroyed()) {
        console.debug('Viewport has been destroyed, skipping index update');
        return;
      }

      try {
        const { imageIndex, newImageIdIndex = imageIndex, imageIdIndex } = event.detail;
        const numberOfSlices = viewport.getNumberOfSlices();
        // find the index of imageId in the imageIds
        setImageSliceData({
          imageIndex: newImageIdIndex ?? imageIdIndex,
          numberOfSlices,
        });
      } catch (error) {
        if (error?.message?.includes('destroyed') || error?.message?.includes('no longer usable')) {
          console.debug('Viewport was destroyed during index update');
          return;
        }
        throw error;
      }
    };

    element.addEventListener(eventId, updateIndex);

    return () => {
      element.removeEventListener(eventId, updateIndex);
    };
  }, [viewportData, element]);

  return (
    <ImageScrollbar
      onChange={evt => onImageScrollbarChange(evt, viewportId)}
      max={imageSliceData.numberOfSlices ? imageSliceData.numberOfSlices - 1 : 0}
      height={scrollbarHeight}
      value={imageSliceData.imageIndex || 0}
    />
  );
}

CornerstoneImageScrollbar.propTypes = {
  viewportData: PropTypes.object,
  viewportId: PropTypes.string.isRequired,
  element: PropTypes.instanceOf(Element),
  scrollbarHeight: PropTypes.string,
  imageSliceData: PropTypes.object.isRequired,
  setImageSliceData: PropTypes.func.isRequired,
  servicesManager: PropTypes.object.isRequired,
};

export default CornerstoneImageScrollbar;
