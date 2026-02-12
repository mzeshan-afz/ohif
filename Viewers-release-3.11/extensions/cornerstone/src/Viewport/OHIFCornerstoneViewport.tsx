import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as cs3DTools from '@cornerstonejs/tools';
import { Enums, eventTarget, getEnabledElement, utilities as csUtils } from '@cornerstonejs/core';
import { MeasurementService, useViewportRef, useSystem } from '@ohif/core';
import { useViewportDialog, Icons, useCine } from '@ohif/ui-next';
import { getViewportEnabledElement } from '../utils/getViewportEnabledElement'; import type { Types as csTypes } from '@cornerstonejs/core';

import { setEnabledElement } from '../state';

import './OHIFCornerstoneViewport.css';
import CornerstoneOverlays from './Overlays/CornerstoneOverlays';
import CinePlayer from '../components/CinePlayer';
import type { Types } from '@ohif/core';

import OHIFViewportActionCorners from '../components/OHIFViewportActionCorners';
import { getViewportPresentations } from '../utils/presentations/getViewportPresentations';
import { useSynchronizersStore } from '../stores/useSynchronizersStore';
import ActiveViewportBehavior from '../utils/ActiveViewportBehavior';
import { WITH_NAVIGATION } from '../services/ViewportService/CornerstoneViewportService';

const STACK = 'stack';

// Cache for viewport dimensions, persists across component remounts
const viewportDimensions = new Map<string, { width: number; height: number }>();

// Todo: This should be done with expose of internal API similar to react-vtkjs-viewport
// Then we don't need to worry about the re-renders if the props change.
const OHIFCornerstoneViewport = React.memo(
  (
    props: withAppTypes<{
      viewportId: string;
      displaySets: AppTypes.DisplaySet[];
      viewportOptions: AppTypes.ViewportGrid.GridViewportOptions;
      initialImageIndex: number;
    }>
  ) => {
    const {
      displaySets,
      dataSource,
      viewportOptions,
      displaySetOptions,
      servicesManager,
      onElementEnabled,
      // eslint-disable-next-line react/prop-types
      onElementDisabled,
      isJumpToMeasurementDisabled = false,
      // Note: you SHOULD NOT use the initialImageIdOrIndex for manipulation
      // of the imageData in the OHIFCornerstoneViewport. This prop is used
      // to set the initial state of the viewport's first image to render
      // eslint-disable-next-line react/prop-types
      initialImageIndex,
      // if the viewport is part of a hanging protocol layout
      // we should not really rely on the old synchronizers and
      // you see below we only rehydrate the synchronizers if the viewport
      // is not part of the hanging protocol layout. HPs should
      // define their own synchronizers. Since the synchronizers are
      // viewportId dependent and
      // eslint-disable-next-line react/prop-types
      isHangingProtocolLayout,
    } = props;
    const viewportId = viewportOptions.viewportId;

    if (!viewportId) {
      throw new Error('Viewport ID is required');
    }

    // Make sure displaySetOptions has one object per displaySet
    while (displaySetOptions.length < displaySets.length) {
      displaySetOptions.push({});
    }

    // Since we only have support for dynamic data in volume viewports, we should
    // handle this case here and set the viewportType to volume if any of the
    // displaySets are dynamic volumes
    viewportOptions.viewportType = displaySets.some(
      ds => ds.isDynamicVolume && ds.isReconstructable
    )
      ? 'volume'
      : viewportOptions.viewportType;

    const [scrollbarHeight, setScrollbarHeight] = useState('100px');
    const [enabledVPElement, setEnabledVPElement] = useState(null);
    const elementRef = useRef() as React.MutableRefObject<HTMLDivElement>;
    const viewportRef = useViewportRef(viewportId);

    const {
      displaySetService,
      toolbarService,
      toolGroupService,
      syncGroupService,
      cornerstoneViewportService,
      segmentationService,
      cornerstoneCacheService,
      customizationService,
      measurementService,
    } = servicesManager.services;

    const { commandsManager } = useSystem();
    const [viewportDialogState] = useViewportDialog();
    // useCallback for scroll bar height calculation
    const setImageScrollBarHeight = useCallback(() => {
      const scrollbarHeight = `${elementRef.current.clientHeight - 10}px`;
      setScrollbarHeight(scrollbarHeight);
    }, [elementRef]);

    // useCallback for onResize
    const onResize = useCallback(
      (entries: ResizeObserverEntry[]) => {
        if (elementRef.current && entries?.length) {
          const entry = entries[0];
          const { width, height } = entry.contentRect;

          const prevDimensions = viewportDimensions.get(viewportId) || { width: 0, height: 0 };

          // Check if dimensions actually changed and then only resize if they have changed
          const hasDimensionsChanged =
            prevDimensions.width !== width || prevDimensions.height !== height;

          if (width > 0 && height > 0 && hasDimensionsChanged) {
            viewportDimensions.set(viewportId, { width, height });
            // Perform resize operations
            cornerstoneViewportService.resize();
            setImageScrollBarHeight();
          }
        }
      },
      [viewportId, elementRef, cornerstoneViewportService, setImageScrollBarHeight]
    );

    useEffect(() => {
      const element = elementRef.current;
      if (!element) {
        return;
      }

      const resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(element);

      // Cleanup function
      return () => {
        resizeObserver.unobserve(element);
        resizeObserver.disconnect();
      };
    }, [onResize]);

    const cleanUpServices = useCallback(
      viewportInfo => {
        const renderingEngineId = viewportInfo.getRenderingEngineId();
        const syncGroups = viewportInfo.getSyncGroups();

        toolGroupService.removeViewportFromToolGroup(viewportId, renderingEngineId);
        syncGroupService.removeViewportFromSyncGroup(viewportId, renderingEngineId, syncGroups);

        segmentationService.clearSegmentationRepresentations(viewportId);
      },
      [viewportId, segmentationService, syncGroupService, toolGroupService]
    );

    const elementEnabledHandler = useCallback(
      evt => {
        // check this is this element reference and return early if doesn't match
        if (evt.detail.element !== elementRef.current) {
          return;
        }

        const { viewportId, element } = evt.detail;
        const viewportInfo = cornerstoneViewportService.getViewportInfo(viewportId);

        if (!viewportInfo) {
          return;
        }

        setEnabledElement(viewportId, element);
        setEnabledVPElement(element);

        const renderingEngineId = viewportInfo.getRenderingEngineId();
        const toolGroupId = viewportInfo.getToolGroupId();
        const syncGroups = viewportInfo.getSyncGroups();

        toolGroupService.addViewportToToolGroup(viewportId, renderingEngineId, toolGroupId);

        syncGroupService.addViewportToSyncGroup(viewportId, renderingEngineId, syncGroups);

        // we don't need reactivity here so just use state
        const { synchronizersStore } = useSynchronizersStore.getState();
        if (synchronizersStore?.[viewportId]?.length && !isHangingProtocolLayout) {
          // If the viewport used to have a synchronizer, re apply it again
          _rehydrateSynchronizers(viewportId, syncGroupService);
        }

        if (onElementEnabled && typeof onElementEnabled === 'function') {
          onElementEnabled(evt);
        }
      },
      [viewportId, onElementEnabled, toolGroupService]
    );

    // disable the element upon unmounting
    useEffect(() => {
      cornerstoneViewportService.enableViewport(viewportId, elementRef.current);

      eventTarget.addEventListener(Enums.Events.ELEMENT_ENABLED, elementEnabledHandler);

      setImageScrollBarHeight();

      return () => {
        const viewportInfo = cornerstoneViewportService.getViewportInfo(viewportId);

        if (!viewportInfo) {
          return;
        }

        cornerstoneViewportService.storePresentation({ viewportId });

        // This should be done after the store presentation since synchronizers
        // will get cleaned up and they need the viewportInfo to be present
        cleanUpServices(viewportInfo);

        if (onElementDisabled && typeof onElementDisabled === 'function') {
          onElementDisabled(viewportInfo);
        }

        cornerstoneViewportService.disableElement(viewportId);
        viewportRef.unregister();

        eventTarget.removeEventListener(Enums.Events.ELEMENT_ENABLED, elementEnabledHandler);
      };
    }, []);

    // subscribe to displaySet metadata invalidation (updates)
    // Currently, if the metadata changes we need to re-render the display set
    // for it to take effect in the viewport. As we deal with scaling in the loading,
    // we need to remove the old volume from the cache, and let the
    // viewport to re-add it which will use the new metadata. Otherwise, the
    // viewport will use the cached volume and the new metadata will not be used.
    // Note: this approach does not actually end of sending network requests
    // and it uses the network cache
    useEffect(() => {
      const { unsubscribe } = displaySetService.subscribe(
        displaySetService.EVENTS.DISPLAY_SET_SERIES_METADATA_INVALIDATED,
        async ({
          displaySetInstanceUID: invalidatedDisplaySetInstanceUID,
          invalidateData,
        }: Types.DisplaySetSeriesMetadataInvalidatedEvent) => {
          if (!invalidateData) {
            return;
          }

          const viewportInfo = cornerstoneViewportService.getViewportInfo(viewportId);

          if (viewportInfo.hasDisplaySet(invalidatedDisplaySetInstanceUID)) {
            const viewportData = viewportInfo.getViewportData();
            const newViewportData = await cornerstoneCacheService.invalidateViewportData(
              viewportData,
              invalidatedDisplaySetInstanceUID,
              dataSource,
              displaySetService
            );

            const keepCamera = true;
            cornerstoneViewportService.updateViewport(viewportId, newViewportData, keepCamera);
          }
        }
      );
      return () => {
        unsubscribe();
      };
    }, [viewportId]);

    useEffect(() => {
      // handle the default viewportType to be stack
      if (!viewportOptions.viewportType) {
        viewportOptions.viewportType = STACK;
      }

      const loadViewportData = async () => {
        const viewportData = await cornerstoneCacheService.createViewportData(
          displaySets,
          viewportOptions,
          dataSource,
          initialImageIndex
        );

        const presentations = getViewportPresentations(viewportId, viewportOptions);

        // Note: This is a hack to get the grid to re-render the OHIFCornerstoneViewport component
        // Used for segmentation hydration right now, since the logic to decide whether
        // a viewport needs to render a segmentation lives inside the CornerstoneViewportService
        // so we need to re-render (force update via change of the needsRerendering) so that React
        // does the diffing and decides we should render this again (although the id and element has not changed)
        // so that the CornerstoneViewportService can decide whether to render the segmentation or not. Not that we reached here we can turn it off.
        if (viewportOptions.needsRerendering) {
          viewportOptions.needsRerendering = false;
        }

        cornerstoneViewportService.setViewportData(
          viewportId,
          viewportData,
          viewportOptions,
          displaySetOptions,
          presentations
        );
      };

      loadViewportData();
    }, [viewportOptions, displaySets, dataSource]);

    const Notification = customizationService.getCustomization('ui.notificationComponent');

    // Handler for series navigation buttons (mobile only)
    const handleSeriesNavigation = useCallback(
      (direction: number) => {
        commandsManager.runCommand('updateViewportDisplaySet', { direction });
      },
      [commandsManager]
    );

    // Handler for image navigation (previous/next image in series)
    const handleImageNavigation = useCallback(
      (direction: number) => {
        // Get the enabled element for this specific viewport
        const enabledElement = getViewportEnabledElement(viewportId);

        if (!enabledElement) {
          console.warn('No enabled element found for viewport:', viewportId);
          return;
        }

        const { viewport } = enabledElement;

        if (!viewport) {
          console.warn('No viewport found for enabled element');
          return;
        }

        try {
          // Get current image index and total number of slices
          const currentImageIndex = viewport.getCurrentImageIdIndex();
          const numberOfSlices = viewport.getNumberOfSlices();

          if (numberOfSlices === 0) {
            console.warn('No slices available in viewport');
            return;
          }

          // Calculate new image index
          let newImageIndex = currentImageIndex + direction;

          // Handle bounds (wrap around or clamp)
          if (newImageIndex < 0) {
            newImageIndex = numberOfSlices - 1;
          } else if (newImageIndex >= numberOfSlices) {
            newImageIndex = 0;
          }

          // Use jumpToSlice with debounceLoading to prevent loading indicator issues
          csUtils.jumpToSlice(viewport.element, {
            imageIndex: newImageIndex,
            debounceLoading: true,
          });
        } catch (error) {
          console.warn('Error navigating image:', error);
          // Fallback to scroll if jumpToSlice fails
          csUtils.scroll(viewport, { delta: direction });
        }
      },
      [viewportId]
    );

    // Get cine state to check if video is playing
    const [{ cines }] = useCine();
    const isPlaying = cines?.[viewportId]?.isPlaying || false;

    // Check if only one viewport is displayed (for showing series navigation buttons)
    const { viewports } = servicesManager.services.viewportGridService.getState();
    const isSingleViewport = viewports.size === 1;

    return (
      <React.Fragment>
        <div className="viewport-wrapper">
          <div
            className="cornerstone-viewport-element"
            style={{ height: '100%', width: '100%' }}
            onContextMenu={e => e.preventDefault()}
            onMouseDown={e => e.preventDefault()}
            data-viewportid={viewportId}
            ref={el => {
              elementRef.current = el;
              if (el) {
                viewportRef.register(el);
              }
            }}
          ></div>
          <CornerstoneOverlays
            viewportId={viewportId}
            toolBarService={toolbarService}
            element={elementRef.current}
            scrollbarHeight={scrollbarHeight}
            servicesManager={servicesManager}
          />
          <CinePlayer
            enabledVPElement={enabledVPElement}
            viewportId={viewportId}
            servicesManager={servicesManager}
          />
          {/* Series Navigation Buttons - Single Viewport Only (visible on all screen sizes) */}
          {isSingleViewport && (
            <div className="absolute bottom-14  left-1/2 -translate-x-1/2 z-10   flex gap-2  ">
              {/* Previous Series Button */}
              <button
                onClick={() => handleSeriesNavigation(-1)}
                className="cursor-pointer flex items-center justify-center shrink-0 text-highlight active:text-foreground hover:bg-primary/30 rounded p-2"
                title="Previous Series"
              >
                <Icons.ArrowLeftBold className="w-8 h-8 lg:w-10 lg:h-10" />
              </button>

              {/* Next Series Button */}
              <button
                onClick={() => handleSeriesNavigation(1)}
                className="cursor-pointer flex items-center justify-center shrink-0 text-highlight active:text-foreground hover:bg-primary/30 rounded p-2"
                title="Next Series"
              >
                <Icons.ArrowRightBold className="w-8 h-8 lg:w-10 lg:h-10" />
              </button>
            </div>
          )}
          {/* Image Navigation Buttons - Left and Right Center (visible only when video is NOT playing) */}
          {!isPlaying && (
            <>
              {/* Previous Image Button - Left Center */}
              <button
                onClick={() => handleImageNavigation(-1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 cursor-pointer flex items-center justify-center shrink-0 text-highlight active:text-foreground hover:bg-primary/30 rounded p-2"
                title="Previous Image"
              >
                <Icons.ArrowLeftBold className="w-8 h-8 lg:w-10 lg:h-10" />
              </button>

              {/* Next Image Button - Right Center */}
              <button
                onClick={() => handleImageNavigation(1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 cursor-pointer flex items-center justify-center shrink-0 text-highlight active:text-foreground hover:bg-primary/30 rounded p-2"
                title="Next Image"
              >
                <Icons.ArrowRightBold className="w-8 h-8 lg:w-10 lg:h-10" />
              </button>
            </>
          )}
          <ActiveViewportBehavior
            viewportId={viewportId}
            servicesManager={servicesManager}
          />
        </div>
        {/* top offset of 24px to account for ViewportActionCorners. */}
        <div className="absolute top-[24px] w-full">
          {viewportDialogState.viewportId === viewportId && (
            <Notification
              id="viewport-notification"
              message={viewportDialogState.message}
              type={viewportDialogState.type}
              actions={viewportDialogState.actions}
              onSubmit={viewportDialogState.onSubmit}
              onOutsideClick={viewportDialogState.onOutsideClick}
              onKeyPress={viewportDialogState.onKeyPress}
            />
          )}
        </div>
        {/* The OHIFViewportActionCorners follows the viewport in the DOM so that it is naturally at a higher z-index.*/}
        <OHIFViewportActionCorners viewportId={viewportId} />
      </React.Fragment>
    );
  },
  areEqual
);

function _rehydrateSynchronizers(viewportId: string, syncGroupService: any) {
  const { synchronizersStore } = useSynchronizersStore.getState();
  const synchronizers = synchronizersStore[viewportId];

  if (!synchronizers) {
    return;
  }

  synchronizers.forEach(synchronizerObj => {
    if (!synchronizerObj.id) {
      return;
    }

    const { id, sourceViewports, targetViewports } = synchronizerObj;

    const synchronizer = syncGroupService.getSynchronizer(id);

    if (!synchronizer) {
      return;
    }

    const sourceViewportInfo = sourceViewports.find(
      sourceViewport => sourceViewport.viewportId === viewportId
    );

    const targetViewportInfo = targetViewports.find(
      targetViewport => targetViewport.viewportId === viewportId
    );

    const isSourceViewportInSynchronizer = synchronizer
      .getSourceViewports()
      .find(sourceViewport => sourceViewport.viewportId === viewportId);

    const isTargetViewportInSynchronizer = synchronizer
      .getTargetViewports()
      .find(targetViewport => targetViewport.viewportId === viewportId);

    // if the viewport was previously a source viewport, add it again
    if (sourceViewportInfo && !isSourceViewportInSynchronizer) {
      synchronizer.addSource({
        viewportId: sourceViewportInfo.viewportId,
        renderingEngineId: sourceViewportInfo.renderingEngineId,
      });
    }

    // if the viewport was previously a target viewport, add it again
    if (targetViewportInfo && !isTargetViewportInSynchronizer) {
      synchronizer.addTarget({
        viewportId: targetViewportInfo.viewportId,
        renderingEngineId: targetViewportInfo.renderingEngineId,
      });
    }
  });
}

// Component displayName
OHIFCornerstoneViewport.displayName = 'OHIFCornerstoneViewport';

function areEqual(prevProps, nextProps) {
  if (nextProps.needsRerendering) {
    return false;
  }

  if (prevProps.displaySets.length !== nextProps.displaySets.length) {
    return false;
  }

  if (prevProps.viewportOptions.orientation !== nextProps.viewportOptions.orientation) {
    return false;
  }

  if (prevProps.viewportOptions.toolGroupId !== nextProps.viewportOptions.toolGroupId) {
    return false;
  }

  if (
    nextProps.viewportOptions.viewportType &&
    prevProps.viewportOptions.viewportType !== nextProps.viewportOptions.viewportType
  ) {
    return false;
  }

  if (nextProps.viewportOptions.needsRerendering) {
    return false;
  }

  const prevDisplaySets = prevProps.displaySets;
  const nextDisplaySets = nextProps.displaySets;

  if (prevDisplaySets.length !== nextDisplaySets.length) {
    return false;
  }

  for (let i = 0; i < prevDisplaySets.length; i++) {
    const prevDisplaySet = prevDisplaySets[i];

    const foundDisplaySet = nextDisplaySets.find(
      nextDisplaySet =>
        nextDisplaySet.displaySetInstanceUID === prevDisplaySet.displaySetInstanceUID
    );

    if (!foundDisplaySet) {
      return false;
    }

    // check they contain the same image
    if (foundDisplaySet.images?.length !== prevDisplaySet.images?.length) {
      return false;
    }

    // check if their imageIds are the same
    if (foundDisplaySet.images?.length) {
      for (let j = 0; j < foundDisplaySet.images.length; j++) {
        if (foundDisplaySet.images[j].imageId !== prevDisplaySet.images[j].imageId) {
          return false;
        }
      }
    }
  }

  return true;
}

export default OHIFCornerstoneViewport;
