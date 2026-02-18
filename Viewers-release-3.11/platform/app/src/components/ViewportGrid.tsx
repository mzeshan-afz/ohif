import React, { useEffect, useCallback, useRef, useState } from 'react';
import { Types } from '@ohif/core';
import { ViewportGrid, ViewportPane, Icons } from '@ohif/ui-next';
import { useViewportGrid } from '@ohif/ui-next';
import EmptyViewport from './EmptyViewport';
import { useAppConfig } from '@state';

function ViewerViewportGrid(props: withAppTypes) {
  const { servicesManager, viewportComponents = [], dataSource, commandsManager } = props;
  const [viewportGrid, viewportGridService] = useViewportGrid();
  const [appConfig] = useAppConfig();

  const { layout, activeViewportId, viewports, isHangingProtocolLayout } = viewportGrid;
  const { numCols, numRows } = layout;
  const layoutHash = useRef(null);
  const [canNavigateForwardState, setCanNavigateForwardState] = useState(false);
  const [canNavigateBackwardState, setCanNavigateBackwardState] = useState(false);
  const previousViewportCountRef = useRef(viewports.size);

  const { displaySetService, hangingProtocolService, uiNotificationService, customizationService } =
    servicesManager.services;

  const generateLayoutHash = () => `${numCols}-${numRows}`;

  /**
   * This callback runs after the viewports structure has changed in any way.
   * On initial display, that means if it has changed by applying a HangingProtocol,
   * while subsequently it may mean by changing the stage or by manually adjusting
   * the layout.

   */
  const updateDisplaySetsFromProtocol = (
    _protocol: Types.HangingProtocol.Protocol,
    stage,
    _activeStudyUID,
    viewportMatchDetails
  ) => {
    const availableDisplaySets = displaySetService.getActiveDisplaySets();

    if (!availableDisplaySets.length) {
      console.log('No available display sets', availableDisplaySets);
      return;
    }

    // Match each viewport individually
    const { layoutType } = stage.viewportStructure;
    const stageProps = stage.viewportStructure.properties;
    const { columns: numCols, rows: numRows, layoutOptions = [] } = stageProps;

    /**
     * This find or create viewport uses the hanging protocol results to
     * specify the viewport match details, which specifies the size and
     * setup of the various viewports.
     */
    const findOrCreateViewport = pos => {
      const viewportId = Array.from(viewportMatchDetails.keys())[pos];
      const details = viewportMatchDetails.get(viewportId);
      if (!details) {
        console.log('No match details for viewport', viewportId);
        return;
      }

      const { displaySetsInfo, viewportOptions } = details;
      const displaySetUIDsToHang = [];
      const displaySetUIDsToHangOptions = [];

      displaySetsInfo.forEach(({ displaySetInstanceUID, displaySetOptions }) => {
        if (displaySetInstanceUID) {
          displaySetUIDsToHang.push(displaySetInstanceUID);
        }

        displaySetUIDsToHangOptions.push(displaySetOptions);
      });

      const computedViewportOptions = hangingProtocolService.getComputedOptions(
        viewportOptions,
        displaySetUIDsToHang
      );

      const computedDisplaySetOptions = hangingProtocolService.getComputedOptions(
        displaySetUIDsToHangOptions,
        displaySetUIDsToHang
      );

      return {
        displaySetInstanceUIDs: displaySetUIDsToHang,
        displaySetOptions: computedDisplaySetOptions,
        viewportOptions: computedViewportOptions,
      };
    };

    viewportGridService.setLayout({
      numRows,
      numCols,
      layoutType,
      layoutOptions,
      findOrCreateViewport,
      isHangingProtocolLayout: true,
    });
  };

  const _getUpdatedViewports = useCallback(
    (viewportId, displaySetInstanceUID) => {
      if (!displaySetInstanceUID) {
        return [];
      }

      let updatedViewports = [];
      try {
        updatedViewports = hangingProtocolService.getViewportsRequireUpdate(
          viewportId,
          displaySetInstanceUID,
          isHangingProtocolLayout
        );
      } catch (error) {
        console.warn(error);
        uiNotificationService.show({
          title: 'Drag and Drop',
          message:
            'The selected display sets could not be added to the viewport due to a mismatch in the Hanging Protocol rules.',
          type: 'error',
          duration: 3000,
        });
      }

      return updatedViewports;
    },
    [hangingProtocolService, uiNotificationService, isHangingProtocolLayout]
  );

  // Using Hanging protocol engine to match the displaySets
  useEffect(() => {
    const { unsubscribe } = hangingProtocolService.subscribe(
      hangingProtocolService.EVENTS.PROTOCOL_CHANGED,
      ({ protocol, stage, activeStudyUID, viewportMatchDetails }) => {
        updateDisplaySetsFromProtocol(protocol, stage, activeStudyUID, viewportMatchDetails);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Check viewport readiness in useEffect
  useEffect(() => {
    const allReady = viewportGridService.getGridViewportsReady();
    const sameLayoutHash = layoutHash.current === generateLayoutHash();
    if (allReady && !sameLayoutHash) {
      layoutHash.current = generateLayoutHash();
      viewportGridService.publishViewportsReady();
    }
  }, [viewportGridService, generateLayoutHash]);

  const onDropHandler = (viewportId, { displaySetInstanceUID }) => {
    const { viewportGridService } = servicesManager.services;
    const customOnDropHandler = customizationService.getCustomization('customOnDropHandler');
    const dropHandlerPromise = customOnDropHandler({
      ...props,
      viewportId,
      displaySetInstanceUID,
      appConfig,
    });
    dropHandlerPromise.then(({ handled }) => {
      if (!handled) {
        const updatedViewports = _getUpdatedViewports(viewportId, displaySetInstanceUID);

        commandsManager.run('setDisplaySetsForViewports', { viewportsToUpdate: updatedViewports });
      }
    });
    viewportGridService.publishViewportOnDropHandled({ displaySetInstanceUID });
  };

  const getViewportPanes = useCallback(() => {
    const viewportPanes = [];

    const numViewportPanes = viewportGridService.getNumViewportPanes();
    for (let i = 0; i < numViewportPanes; i++) {
      const paneMetadata = Array.from(viewports.values())[i] || {};
      const {
        displaySetInstanceUIDs,
        viewportOptions,
        displaySetOptions, // array of options for each display set in the viewport
        x: viewportX,
        y: viewportY,
        width: viewportWidth,
        height: viewportHeight,
        viewportLabel,
      } = paneMetadata;

      const viewportId = viewportOptions.viewportId;
      const isActive = activeViewportId === viewportId;

      const displaySetInstanceUIDsToUse = displaySetInstanceUIDs || [];

      // This is causing the viewport components re-render when the activeViewportId changes
      const displaySets = displaySetInstanceUIDsToUse
        .map(displaySetInstanceUID => {
          return displaySetService.getDisplaySetByUID(displaySetInstanceUID) || {};
        })
        .filter(displaySet => {
          return !displaySet?.unsupported;
        });

      const { component: ViewportComponent } = _getViewportComponent(
        displaySets,
        viewportComponents,
        uiNotificationService
      );

      // look inside displaySets to see if they need reRendering
      const displaySetsNeedsRerendering = displaySets.some(displaySet => {
        return displaySet.needsRerendering;
      });

      const onInteractionHandler = event => {
        if (isActive) {
          return;
        }

        if (event && (appConfig?.activateViewportBeforeInteraction ?? true)) {
          event.preventDefault();
          event.stopPropagation();
        }

        viewportGridService.setActiveViewportId(viewportId);
      };

      const getBorderStyle = viewportIndex => {
        const style = {} as any;
        const layoutOptions = viewportGridService.getLayoutOptionsFromState(
          viewportGridService.getState()
        );
        const vp = layoutOptions[viewportIndex];
        if (!vp) {
          return style;
        }
        const { x, y, width, height } = vp;
        const tolerance = 0.01;

        if (x + width < 1 - tolerance) {
          style.borderRight = '1px solid hsl(var(--input))';
        }

        if (y + height < 1 - tolerance) {
          style.borderBottom = '1px solid hsl(var(--input))';
        }

        return style;
      };

      viewportPanes[i] = (
        <ViewportPane
          // Note: It is highly important that the key is the viewportId here,
          // since it is used to determine if the component should be re-rendered
          // by React, and also in the hanging protocol and stage changes if the
          // same viewportId is used, React, by default, will only move (not re-render)
          // those components. For instance, if we have a 2x3 layout, and we move
          // from 2x3 to 1x1 (second viewport), if the key is the viewportIndex,
          // React will RE-RENDER the resulting viewport as the key will be different.
          // however, if the key is the viewportId, React will only move the component
          // and not re-render it.
          key={viewportId}
          acceptDropsFor="displayset"
          onDrop={onDropHandler.bind(null, viewportId)}
          onInteraction={onInteractionHandler}
          customStyle={{
            position: 'absolute',
            top: viewportY * 100 + '%',
            left: viewportX * 100 + '%',
            width: viewportWidth * 100 + '%',
            height: viewportHeight * 100 + '%',
            ...getBorderStyle(i),
          }}
          isActive={isActive}
        >
          <div
            data-cy="viewport-pane"
            className="flex h-full w-full min-w-[5px] flex-col"
          >
            <ViewportComponent
              displaySets={displaySets}
              viewportLabel={viewports.size > 1 ? viewportLabel : ''}
              viewportId={viewportId}
              dataSource={dataSource}
              viewportOptions={viewportOptions}
              displaySetOptions={displaySetOptions}
              needsRerendering={displaySetsNeedsRerendering}
              isHangingProtocolLayout={isHangingProtocolLayout}
              onElementEnabled={evt => {
                viewportGridService.setViewportIsReady(viewportId, true);
              }}
            />
          </div>
        </ViewportPane>
      );
    }

    return viewportPanes;
  }, [viewports, activeViewportId, viewportComponents, dataSource]);

  // Auto-populate new viewports when layout changes and viewports are added
  useEffect(() => {
    const previousCount = previousViewportCountRef.current;
    const currentCount = viewports.size;

    // Only auto-populate if viewports increased (not decreased or same)
    if (currentCount > previousCount && currentCount > 1 && previousCount > 0) {
      const currentDisplaySets = displaySetService.activeDisplaySets;
      const nonImageModalities = ['SR', 'SEG', 'SM', 'RTSTRUCT', 'RTPLAN', 'RTDOSE'];
      const filteredDisplaySets = currentDisplaySets.filter(ds => !nonImageModalities.includes(ds.Modality));

      if (filteredDisplaySets.length === 0) {
        previousViewportCountRef.current = currentCount;
        return;
      }

      // Find the maximum index of currently displayed series
      let maxIndex = -1;
      viewports.forEach((viewport, viewportId) => {
        if (!viewport.displaySetInstanceUIDs || viewport.displaySetInstanceUIDs.length === 0) {
          return;
        }
        const currentDisplaySetInstanceUID = viewport.displaySetInstanceUIDs[0];
        const currentDisplaySetIndex = filteredDisplaySets.findIndex(
          displaySet => displaySet.displaySetInstanceUID === currentDisplaySetInstanceUID
        );
        if (currentDisplaySetIndex !== -1 && currentDisplaySetIndex > maxIndex) {
          maxIndex = currentDisplaySetIndex;
        }
      });

      // Find viewports that don't have display sets (newly added viewports)
      const newViewports = Array.from(viewports.entries()).filter(
        ([viewportId, viewport]) =>
          !viewport.displaySetInstanceUIDs || viewport.displaySetInstanceUIDs.length === 0
      );

      if (newViewports.length > 0 && maxIndex !== -1) {
        // Calculate starting index for new viewports (continue from maxIndex + 1)
        const startIndex = maxIndex + 1;
        const viewportsToUpdate = [];

        newViewports.forEach(([viewportId], index) => {
          const seriesIndex = startIndex + index;

          if (seriesIndex >= filteredDisplaySets.length || seriesIndex < 0) {
            return; // Skip if out of bounds
          }

          const { displaySetInstanceUID } = filteredDisplaySets[seriesIndex];

          try {
            const updatedViewportsForThis = hangingProtocolService.getViewportsRequireUpdate(
              viewportId,
              displaySetInstanceUID,
              isHangingProtocolLayout
            );
            viewportsToUpdate.push(...updatedViewportsForThis);
          } catch (error) {
            console.warn(`Error updating new viewport ${viewportId}:`, error);
          }
        });

        if (viewportsToUpdate.length > 0) {
          // Use setTimeout to ensure layout change is complete before updating
          setTimeout(() => {
            commandsManager.runCommand('setDisplaySetsForViewports', { viewportsToUpdate });
          }, 100);
        }
      }
    }

    // Update the previous count
    previousViewportCountRef.current = currentCount;
  }, [viewports.size, displaySetService, hangingProtocolService, isHangingProtocolLayout, commandsManager]);

  // Update navigation bounds when viewports or display sets change
  useEffect(() => {
    const updateNavigationBounds = () => {
      if (viewports.size <= 1) {
        setCanNavigateForwardState(false);
        setCanNavigateBackwardState(false);
        return;
      }

      const currentDisplaySets = displaySetService.activeDisplaySets;
      const nonImageModalities = ['SR', 'SEG', 'SM', 'RTSTRUCT', 'RTPLAN', 'RTDOSE'];
      const filteredDisplaySets = currentDisplaySets.filter(ds => !nonImageModalities.includes(ds.Modality));

      if (filteredDisplaySets.length === 0) {
        setCanNavigateForwardState(false);
        setCanNavigateBackwardState(false);
        return;
      }

      // Find the min and max indices of currently displayed series
      let minIndex = Infinity;
      let maxIndex = -1;

      viewports.forEach((viewport, viewportId) => {
        if (!viewport.displaySetInstanceUIDs || viewport.displaySetInstanceUIDs.length === 0) {
          return;
        }
        const currentDisplaySetInstanceUID = viewport.displaySetInstanceUIDs[0];
        const currentDisplaySetIndex = filteredDisplaySets.findIndex(
          displaySet => displaySet.displaySetInstanceUID === currentDisplaySetInstanceUID
        );
        if (currentDisplaySetIndex !== -1) {
          if (currentDisplaySetIndex < minIndex) {
            minIndex = currentDisplaySetIndex;
          }
          if (currentDisplaySetIndex > maxIndex) {
            maxIndex = currentDisplaySetIndex;
          }
        }
      });

      // Check if we can go forward (if maxIndex + numViewports < total length)
      const canForward = maxIndex !== -1 && maxIndex + viewports.size < filteredDisplaySets.length;

      // Check if we can go backward (if minIndex - numViewports >= 0)
      const canBackward = minIndex !== Infinity && minIndex - viewports.size >= 0;

      setCanNavigateForwardState(canForward);
      setCanNavigateBackwardState(canBackward);
    };

    updateNavigationBounds();

    // Subscribe to display set changes
    const subscription = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SETS_CHANGED,
      updateNavigationBounds
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [viewports, displaySetService]);

  // Handler for multi-viewport series navigation
  const handleAllViewportsNavigation = useCallback(
    (direction: number) => {
      commandsManager.runCommand('updateAllViewportsDisplaySet', { direction });
    },
    [commandsManager]
  );

  /**
   * Loading indicator until numCols and numRows are gotten from the HangingProtocolService
   */
  if (!numRows || !numCols) {
    return null;
  }

  const isMultipleViewports = viewports.size > 1;

  return (
    <div className="border-input h-[calc(100%-0.25rem)] w-full border relative">
      <ViewportGrid
        numRows={numRows}
        numCols={numCols}
      >
        {getViewportPanes()}
      </ViewportGrid>
      {/* Series Navigation Buttons - Multiple Viewports (outside viewports, left/right) */}
      {isMultipleViewports && (
        <>
          {/* Previous Series Button - Left */}
          <button
            onClick={() => handleAllViewportsNavigation(-1)}
            disabled={!canNavigateBackwardState}
            className={`absolute left-4 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center shrink-0 rounded p-2 bg-black/50 ${
              canNavigateBackwardState
                ? 'cursor-pointer text-highlight active:text-foreground hover:bg-primary/30'
                : 'cursor-not-allowed text-gray-500 opacity-50'
            }`}
            title="Previous Series (All Viewports)"
          >
            <Icons.ArrowLeftBold className="w-8 h-8 lg:w-10 lg:h-10" />
          </button>

          {/* Next Series Button - Right */}
          <button
            onClick={() => handleAllViewportsNavigation(1)}
            disabled={!canNavigateForwardState}
            className={`absolute right-4 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center shrink-0 rounded p-2 bg-black/50 ${
              canNavigateForwardState
                ? 'cursor-pointer text-highlight active:text-foreground hover:bg-primary/30'
                : 'cursor-not-allowed text-gray-500 opacity-50'
            }`}
            title="Next Series (All Viewports)"
          >
            <Icons.ArrowRightBold className="w-8 h-8 lg:w-10 lg:h-10" />
          </button>
        </>
      )}
    </div>
  );
}

function _getViewportComponent(displaySets, viewportComponents, uiNotificationService) {
  if (!displaySets || !displaySets.length) {
    return { component: EmptyViewport, isReferenceViewable: () => false };
  }

  // Todo: Do we have a viewport that has two different SOPClassHandlerIds?
  const SOPClassHandlerId = displaySets[0].SOPClassHandlerId;

  for (let i = 0; i < viewportComponents.length; i++) {
    if (!viewportComponents[i]) {
      throw new Error('viewport components not defined');
    }
    if (!viewportComponents[i].displaySetsToDisplay) {
      throw new Error('displaySetsToDisplay is null');
    }
    if (viewportComponents[i].displaySetsToDisplay.includes(SOPClassHandlerId)) {
      const { component } = viewportComponents[i];
      return { component };
    }
  }

  console.log("Can't show displaySet", SOPClassHandlerId, displaySets[0]);
  uiNotificationService.show({
    title: 'Viewport Not Supported Yet',
    message: `Cannot display SOPClassUID of ${displaySets[0].SOPClassUID} yet`,
    type: 'error',
  });

  return { component: EmptyViewport };
}

export default ViewerViewportGrid;
