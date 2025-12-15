import React, { useEffect, useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { InvestigationalUseDialog, Button, Icons } from '@ohif/ui-next';
import { HangingProtocolService, CommandsManager } from '@ohif/core';
import { useAppConfig } from '@state';
import ViewerHeader from './ViewerHeader';
import SidePanelWithServices from '../Components/SidePanelWithServices';
import { Onboarding, ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@ohif/ui-next';
import useResizablePanels from './ResizablePanelsHook';

const resizableHandleClassName = 'mt-[1px] bg-black';

// Mobile breakpoint (matches Tailwind's md breakpoint)
const MOBILE_BREAKPOINT = 768;

// Large screen breakpoint for 2x2 layout (matches Tailwind's lg breakpoint)
const LARGE_SCREEN_BREAKPOINT = 1024;

// Hook to detect mobile screen size
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < MOBILE_BREAKPOINT;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

// Hook for responsive viewport layout (1x1 on small/medium, 2x2 on large screens)
const useResponsiveLayout = (commandsManager) => {
  const isLargeScreenRef = useRef(
    typeof window !== 'undefined' ? window.innerWidth >= LARGE_SCREEN_BREAKPOINT : false
  );

  useEffect(() => {
    const handleResize = () => {
      const isNowLargeScreen = window.innerWidth >= LARGE_SCREEN_BREAKPOINT;
      
      // Only trigger layout change if we crossed the breakpoint
      if (isNowLargeScreen !== isLargeScreenRef.current) {
        isLargeScreenRef.current = isNowLargeScreen;
        
        // Change layout based on screen size
        if (isNowLargeScreen) {
          // Large screen: 2x2 layout
          commandsManager.run({
            commandName: 'setViewportGridLayout',
            commandOptions: { numRows: 2, numCols: 2 },
          });
        } else {
          // Small/medium screen: 1x1 layout
          commandsManager.run({
            commandName: 'setViewportGridLayout',
            commandOptions: { numRows: 1, numCols: 1 },
          });
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [commandsManager]);
};

function ViewerLayout({
  // From Extension Module Params
  extensionManager,
  servicesManager,
  hotkeysManager,
  commandsManager,
  // From Modes
  viewports,
  ViewportGridComp,
  leftPanelClosed = false,
  rightPanelClosed = false,
  leftPanelResizable = false,
  rightPanelResizable = false,
  leftPanelInitialExpandedWidth,
  rightPanelInitialExpandedWidth,
  leftPanelMinimumExpandedWidth,
  rightPanelMinimumExpandedWidth,
}: withAppTypes): React.FunctionComponent {
  const [appConfig] = useAppConfig();
  const isMobile = useIsMobile();
  
  // Enable dynamic responsive layout (1x1 on small/medium, 2x2 on large screens)
  useResponsiveLayout(commandsManager);

  const { panelService, hangingProtocolService, customizationService } = servicesManager.services;
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(appConfig.showLoadingIndicator);

  const hasPanels = useCallback(
    (side): boolean => !!panelService.getPanels(side).length,
    [panelService]
  );

  const [hasRightPanels, setHasRightPanels] = useState(hasPanels('right'));
  const [hasLeftPanels, setHasLeftPanels] = useState(hasPanels('left'));
  
  // On mobile, panels start closed by default
  const [leftPanelClosedState, setLeftPanelClosed] = useState(
    isMobile ? true : leftPanelClosed
  );
  const [rightPanelClosedState, setRightPanelClosed] = useState(
    isMobile ? true : rightPanelClosed
  );

  const [
    leftPanelProps,
    rightPanelProps,
    resizablePanelGroupProps,
    resizableLeftPanelProps,
    resizableViewportGridPanelProps,
    resizableRightPanelProps,
    onHandleDragging,
  ] = useResizablePanels(
    leftPanelClosed,
    setLeftPanelClosed,
    rightPanelClosed,
    setRightPanelClosed,
    hasLeftPanels,
    hasRightPanels,
    leftPanelInitialExpandedWidth,
    rightPanelInitialExpandedWidth,
    leftPanelMinimumExpandedWidth,
    rightPanelMinimumExpandedWidth
  );

  const handleMouseEnter = () => {
    (document.activeElement as HTMLElement)?.blur();
  };

  const LoadingIndicatorProgress = customizationService.getCustomization(
    'ui.loadingIndicatorProgress'
  );

  /**
   * Set body classes (tailwindcss) that don't allow vertical
   * or horizontal overflow (no scrolling). Also guarantee window
   * is sized to our viewport.
   */
  useEffect(() => {
    document.body.classList.add('bg-black');
    document.body.classList.add('overflow-hidden');

    return () => {
      document.body.classList.remove('bg-black');
      document.body.classList.remove('overflow-hidden');
    };
  }, []);

  const getComponent = id => {
    const entry = extensionManager.getModuleEntry(id);

    if (!entry || !entry.component) {
      throw new Error(
        `${id} is not valid for an extension module or no component found from extension ${id}. Please verify your configuration or ensure that the extension is properly registered. It's also possible that your mode is utilizing a module from an extension that hasn't been included in its dependencies (add the extension to the "extensionDependencies" array in your mode's index.js file). Check the reference string to the extension in your Mode configuration`
      );
    }

    return { entry };
  };

  
  useEffect(() => {
    const { unsubscribe } = hangingProtocolService.subscribe(
      HangingProtocolService.EVENTS.PROTOCOL_CHANGED,

      // Todo: right now to set the loading indicator to false, we need to wait for the
      // hangingProtocolService to finish applying the viewport matching to each viewport,
      // however, this might not be the only approach to set the loading indicator to false. we need to explore this further.
      () => {
        setShowLoadingIndicator(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [hangingProtocolService]);

  const getViewportComponentData = viewportComponent => {
    const { entry } = getComponent(viewportComponent.namespace);

    return {
      component: entry.component,
      isReferenceViewable: entry.isReferenceViewable,
      displaySetsToDisplay: viewportComponent.displaySetsToDisplay,
    };
  };

  useEffect(() => {
    const { unsubscribe } = panelService.subscribe(
      panelService.EVENTS.PANELS_CHANGED,
      ({ options }) => {
        setHasLeftPanels(hasPanels('left'));
        setHasRightPanels(hasPanels('right'));
        if (options?.leftPanelClosed !== undefined) {
          setLeftPanelClosed(options.leftPanelClosed);
        }
        if (options?.rightPanelClosed !== undefined) {
          setRightPanelClosed(options.rightPanelClosed);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [panelService, hasPanels]);

  const viewportComponents = viewports.map(getViewportComponentData);

  // Mobile panel overlay handlers
  const toggleLeftPanel = useCallback(() => {
    setLeftPanelClosed(prev => !prev);
  }, []);

  const toggleRightPanel = useCallback(() => {
    setRightPanelClosed(prev => !prev);
  }, []);

  // Close panels when clicking outside (works on both mobile and desktop)
  const handleOverlayClick = useCallback((side: 'left' | 'right') => {
    if (side === 'left') {
      setLeftPanelClosed(true);
    } else {
      setRightPanelClosed(true);
    }
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <ViewerHeader
        appConfig={appConfig}
        isMobile={isMobile}
        onToggleLeftPanel={hasLeftPanels ? toggleLeftPanel : undefined}
        onToggleRightPanel={hasRightPanels ? toggleRightPanel : undefined}
        leftPanelOpen={!leftPanelClosedState}
        rightPanelOpen={!rightPanelClosedState}
      />
      <div
        className="relative flex w-full flex-row flex-nowrap items-stretch overflow-hidden bg-black"
        style={{ height: isMobile ? 'calc(100vh - 48px)' : 'calc(100vh - 52px)' }}
      >
        <React.Fragment>
          {showLoadingIndicator && <LoadingIndicatorProgress className="h-full w-full bg-black" />}
          
          {/* Left Panel Overlay - Works on both mobile and desktop */}
          {hasLeftPanels && !leftPanelClosedState && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black bg-opacity-50"
                onClick={() => handleOverlayClick('left')}
              />
              <div
                className={classNames(
                  "fixed left-0 z-50 bg-black",
                  isMobile 
                    ? "top-[48px] h-[calc(100vh-48px)] w-[280px] max-w-[85vw]" 
                    : "top-[52px] h-[calc(100vh-52px)] w-[280px]"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <SidePanelWithServices
                  side="left"
                  isExpanded={true}
                  servicesManager={servicesManager}
                  activeTabIndex={leftPanelProps?.activeTabIndex ?? 0}
                  onClose={leftPanelProps?.onClose ?? (() => {})}
                  onOpen={leftPanelProps?.onOpen ?? (() => {})}
                  expandedWidth={leftPanelProps?.expandedWidth ?? 280}
                  collapsedWidth={leftPanelProps?.collapsedWidth ?? 25}
                  collapsedInsideBorderSize={leftPanelProps?.collapsedInsideBorderSize ?? 8}
                  collapsedOutsideBorderSize={leftPanelProps?.collapsedOutsideBorderSize ?? 4}
                  expandedInsideBorderSize={leftPanelProps?.expandedInsideBorderSize ?? 4}
                />
              </div>
            </>
          )}

          {/* Viewport Grid (Full Width) - Always visible on both mobile and desktop */}
          <div className="flex h-full w-full flex-1 flex-col">
            <div
              className="relative flex h-full flex-1 items-center justify-center overflow-hidden bg-black"
              onMouseEnter={handleMouseEnter}
            >
              <ViewportGridComp
                servicesManager={servicesManager}
                viewportComponents={viewportComponents}
                commandsManager={commandsManager}
              />
            </div>
          </div>

          {/* Right Panel Overlay - Works on both mobile and desktop */}
          {hasRightPanels && !rightPanelClosedState && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black bg-opacity-50"
                onClick={() => handleOverlayClick('right')}
              />
              <div
                className={classNames(
                  "fixed right-0 z-50 bg-black",
                  isMobile 
                    ? "top-[48px] h-[calc(100vh-48px)] w-[280px] max-w-[85vw]" 
                    : "top-[52px] h-[calc(100vh-52px)] w-[280px]"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <SidePanelWithServices
                  side="right"
                  isExpanded={true}
                  servicesManager={servicesManager}
                  activeTabIndex={rightPanelProps?.activeTabIndex ?? 0}
                  onClose={rightPanelProps?.onClose ?? (() => {})}
                  onOpen={rightPanelProps?.onOpen ?? (() => {})}
                  expandedWidth={rightPanelProps?.expandedWidth ?? 280}
                  collapsedWidth={rightPanelProps?.collapsedWidth ?? 25}
                  collapsedInsideBorderSize={rightPanelProps?.collapsedInsideBorderSize ?? 8}
                  collapsedOutsideBorderSize={rightPanelProps?.collapsedOutsideBorderSize ?? 4}
                  expandedInsideBorderSize={rightPanelProps?.expandedInsideBorderSize ?? 4}
                />
              </div>
            </>
          )}
        </React.Fragment>
      </div>
      <Onboarding tours={customizationService.getCustomization('ohif.tours')} />
      {/* <InvestigationalUseDialog dialogConfiguration={appConfig?.investigationalUseDialog} /> */}
    </div>
  );
}

ViewerLayout.propTypes = {
  // From extension module params
  extensionManager: PropTypes.shape({
    getModuleEntry: PropTypes.func.isRequired,
  }).isRequired,
  commandsManager: PropTypes.instanceOf(CommandsManager),
  servicesManager: PropTypes.object.isRequired,
  // From modes
  leftPanels: PropTypes.array,
  rightPanels: PropTypes.array,
  leftPanelClosed: PropTypes.bool.isRequired,
  rightPanelClosed: PropTypes.bool.isRequired,
  /** Responsible for rendering our grid of viewports; provided by consuming application */
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]).isRequired,
  viewports: PropTypes.array,
};

export default ViewerLayout;
