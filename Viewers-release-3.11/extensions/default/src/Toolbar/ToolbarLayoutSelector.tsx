// Updated ToolbarLayoutSelector.tsx
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { CommandsManager, ViewportGridService } from '@ohif/core';

import { LayoutSelector, useViewportGrid } from '@ohif/ui-next';

function ToolbarLayoutSelectorWithServices({
  commandsManager,
  servicesManager,
  rows = 3,
  columns = 4,
  ...props
}) {
  const { customizationService, viewportGridService, displaySetService } = servicesManager.services;
  const [viewportGrid] = useViewportGrid();
  const { viewports } = viewportGrid;
  const [isLayoutDisabled, setIsLayoutDisabled] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Create a memoized readiness key that changes when any viewport's readiness or image completion changes
  // This ensures the effect runs when viewports become ready or complete their image loops
  const viewportReadinessKey = useMemo(() => {
    return Array.from(viewports.values())
      .filter((v: any) => v.displaySetInstanceUIDs && v.displaySetInstanceUIDs.length > 0)
      .map((v: any) => `${v.viewportId}:${v.isReady === true ? '1' : '0'}:${v.allImagesShown === true ? '1' : '0'}`)
      .sort()
      .join('|');
  }, [viewports]);

  // Get the presets from the customization service
  const commonPresets = customizationService?.getCustomization('layoutSelector.commonPresets') || [
    {
      icon: 'layout-single',
      commandOptions: {
        numRows: 1,
        numCols: 1,
      },
    },
    {
      icon: 'layout-side-by-side',
      commandOptions: {
        numRows: 1,
        numCols: 2,
      },
    },
    {
      icon: 'layout-four-up',
      commandOptions: {
        numRows: 2,
        numCols: 2,
      },
    },
    {
      icon: 'layout-three-row',
      commandOptions: {
        numRows: 3,
        numCols: 1,
      },
    },
  ];

  // Get the advanced presets generator from the customization service
  const advancedPresetsGenerator = customizationService?.getCustomization(
    'layoutSelector.advancedPresetGenerator'
  );

  // Generate the advanced presets
  const advancedPresets = advancedPresetsGenerator
    ? advancedPresetsGenerator({ servicesManager })
    : [
      {
        title: 'MPR',
        icon: 'layout-three-col',
        commandOptions: {
          protocolId: 'mpr',
        },
      },
      {
        title: '3D four up',
        icon: 'layout-four-up',
        commandOptions: {
          protocolId: '3d-four-up',
        },
      },
      {
        title: '3D main',
        icon: 'layout-three-row',
        commandOptions: {
          protocolId: '3d-main',
        },
      },
      {
        title: 'Axial Primary',
        icon: 'layout-side-by-side',
        commandOptions: {
          protocolId: 'axial-primary',
        },
      },
      {
        title: '3D only',
        icon: 'layout-single',
        commandOptions: {
          protocolId: '3d-only',
        },
      },
      {
        title: '3D primary',
        icon: 'layout-side-by-side',
        commandOptions: {
          protocolId: '3d-primary',
        },
      },
      {
        title: 'Frame View',
        icon: 'icon-stack',
        commandOptions: {
          protocolId: 'frame-view',
        },
      },
    ];

  // Unified selection handler that dispatches to the appropriate command
  const handleSelectionChange = useCallback(
    (commandOptions, isPreset) => {
      // Prevent layout change if button is disabled
      if (isLayoutDisabled) {
        return;
      }

      if (isPreset) {
        // Advanced preset selection
        commandsManager.run({
          commandName: 'setHangingProtocol',
          commandOptions,
        });
      } else {
        // Common preset or custom grid selection
        commandsManager.run({
          commandName: 'setViewportGridLayout',
          commandOptions,
        });
      }
    },
    [commandsManager, isLayoutDisabled]
  );

  // Update layout disabled state when viewports or display sets change
  useEffect(() => {
    const updateLayoutDisabledState = () => {
      // Only disable if multiple viewports are selected
      if (viewports.size <= 1) {
        setIsLayoutDisabled(false);
        return;
      }

      const currentDisplaySets = displaySetService.activeDisplaySets;
      const nonImageModalities = ['SR', 'SEG', 'SM', 'RTSTRUCT', 'RTPLAN', 'RTDOSE'];
      const filteredDisplaySets = currentDisplaySets.filter(ds => !nonImageModalities.includes(ds.Modality));

      if (filteredDisplaySets.length === 0) {
        setIsLayoutDisabled(false);
        return;
      }

      // Get viewports that have display sets (are actually showing studies)
      const viewportsWithDisplaySets = Array.from(viewports.values()).filter(
        (viewport: any) => viewport?.displaySetInstanceUIDs && viewport.displaySetInstanceUIDs.length > 0
      );

      if (viewportsWithDisplaySets.length === 0) {
        setIsLayoutDisabled(false);
        return;
      }

      // Check if all viewports with display sets have completed their image loops
      const allViewportsImagesShown = viewportGridService.getAllViewportsImagesShown();

      if (!allViewportsImagesShown) {
        // Disable layout button until all viewports have shown all their images
        setIsLayoutDisabled(true);
        return;
      }

      // All images are loaded, enable layout button
      setIsLayoutDisabled(false);
    };

    updateLayoutDisabledState();

    // Subscribe to display set changes
    const subscriptionDisplaySets = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SETS_CHANGED,
      updateLayoutDisabledState
    );

    // Subscribe to grid state changes to catch when viewports become ready
    // This is important because viewport.isReady changes when onElementEnabled fires
    let subscriptionGridState = null;
    if (viewportGridService && typeof viewportGridService.subscribe === 'function') {
      subscriptionGridState = viewportGridService.subscribe(
        ViewportGridService.EVENTS.GRID_STATE_CHANGED,
        updateLayoutDisabledState
      );
    }

    return () => {
      subscriptionDisplaySets.unsubscribe();
      if (subscriptionGridState) {
        subscriptionGridState.unsubscribe();
      }
    };
  }, [viewportReadinessKey, displaySetService, viewportGridService, viewports]);

  return (
    <div
      id="Layout"
      data-cy="Layout"
    >
      <LayoutSelector
        onSelectionChange={handleSelectionChange}
        open={isPopoverOpen}
        onOpenChange={(open) => {
          // Prevent opening if disabled
          if (open && isLayoutDisabled) {
            return;
          }
          setIsPopoverOpen(open);
        }}
        disabled={isLayoutDisabled}
        {...props}
      >
        <LayoutSelector.Trigger
          tooltip="Change layout"
          disabled={isLayoutDisabled}
          disabledText={isLayoutDisabled ? "Waiting for images to load..." : undefined}
        />
        <LayoutSelector.Content>
          {/* Left side - Presets */}
          {(commonPresets.length > 0 || advancedPresets.length > 0) && (
            <div className="bg-popover flex flex-col gap-2.5 rounded-lg p-2">
              {commonPresets.length > 0 && (
                <>
                  <LayoutSelector.PresetSection title="Common">
                    {commonPresets.map((preset, index) => (
                      <LayoutSelector.Preset
                        key={`common-preset-${index}`}
                        icon={preset.icon}
                        commandOptions={preset.commandOptions}
                        isPreset={false}
                      />
                    ))}
                  </LayoutSelector.PresetSection>
                  <LayoutSelector.Divider />
                </>
              )}

              {advancedPresets.length > 0 && (
                <LayoutSelector.PresetSection title="Advanced">
                  {advancedPresets.map((preset, index) => (
                    <LayoutSelector.Preset
                      key={`advanced-preset-${index}`}
                      title={preset.title}
                      icon={preset.icon}
                      commandOptions={preset.commandOptions}
                      disabled={preset.disabled}
                      isPreset={true}
                    />
                  ))}
                </LayoutSelector.PresetSection>
              )}
            </div>
          )}

          {/* Right Side - Grid Layout */}
          <div className="bg-muted flex flex-col gap-2.5 border-l-2 border-solid border-black p-2">
            <div className="text-muted-foreground text-xs">Custom</div>
            <LayoutSelector.GridSelector
              rows={rows}
              columns={columns}
            />
            <LayoutSelector.HelpText>
              Hover to select <br />
              rows and columns <br /> Click to apply
            </LayoutSelector.HelpText>
          </div>
        </LayoutSelector.Content>
      </LayoutSelector>
    </div>
  );
}

ToolbarLayoutSelectorWithServices.propTypes = {
  commandsManager: PropTypes.instanceOf(CommandsManager),
  servicesManager: PropTypes.object,
  rows: PropTypes.number,
  columns: PropTypes.number,
};

export default ToolbarLayoutSelectorWithServices;
