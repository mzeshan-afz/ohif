import React, { useState, useEffect } from 'react';
import { useToolbar } from '@ohif/core';
import { Popover, PopoverTrigger, PopoverContent, Button, Icons } from '@ohif/ui-next';

interface ToolbarProps {
  buttonSection?: string;
  viewportId?: string;
  location?: number;
}

// Mobile breakpoint
const MOBILE_BREAKPOINT = 768;

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

export function Toolbar({ buttonSection = 'primary', viewportId, location }: ToolbarProps) {
  const {
    toolbarButtons,
    onInteraction,
    isItemOpen,
    isItemLocked,
    openItem,
    closeItem,
    toggleLock,
  } = useToolbar({
    buttonSection,
  });

  const isMobile = useIsMobile();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  if (!toolbarButtons.length) {
    return null;
  }

  // Enhanced props factory for tools
  const getEnhancedProps = (toolDef) => {
    const { id, Component, componentProps } = toolDef;
    return {
      ...componentProps,
      isOpen: isItemOpen(id, viewportId),
      isLocked: isItemLocked(id, viewportId),
      onOpen: () => openItem(id, viewportId),
      onClose: () => closeItem(id, viewportId),
      onToggleLock: () => toggleLock(id, viewportId),
      viewportId,
    };
  };

  // Render a single tool
  const renderTool = (toolDef) => {
    if (!toolDef) {
      return null;
    }

    const { id, Component, componentProps } = toolDef;
    const enhancedProps = getEnhancedProps(toolDef);

    const tool = (
      <Component
        key={id}
        id={id}
        location={location}
        onInteraction={args => {
          onInteraction({
            ...args,
            itemId: id,
            viewportId,
          });
          // Close popover on mobile after interaction
          if (isMobile) {
            setIsPopoverOpen(false);
          }
        }}
        {...enhancedProps}
      />
    );

    return <div key={id} className="flex-shrink-0">{tool}</div>;
  };

  // Mobile: Show dropdown with tools
  if (isMobile) {
    return (
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-primary hover:bg-primary-dark h-8 w-8"
            aria-label="Tools menu"
          >
            <Icons.Actions className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          side="bottom"
          className="w-[300px] max-h-[500px] p-3 overflow-y-auto"
        >
          <div className="mb-3 text-sm font-semibold text-white">Tools</div>
          <div className="grid grid-cols-4 gap-3">
            {toolbarButtons?.map(toolDef => {
              if (!toolDef) {
                return null;
              }

              const { id, Component, componentProps } = toolDef;
              const enhancedProps = getEnhancedProps(toolDef);

              // Get tool label from componentProps or try to extract from id
              const toolLabel = componentProps?.label || 
                               componentProps?.toolName ||
                               id.split('-').pop()?.replace(/([A-Z])/g, ' $1').trim() ||
                               id;

              return (
                <div
                  key={id}
                  className="flex flex-col items-center gap-1.5 p-2 rounded hover:bg-primary-dark cursor-pointer transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInteraction({
                      itemId: id,
                      viewportId,
                    });
                    setIsPopoverOpen(false);
                  }}
                >
                  <div className="flex items-center justify-center w-10 h-10">
                    <Component
                      id={id}
                      location={location}
                      onInteraction={args => {
                        onInteraction({
                          ...args,
                          itemId: id,
                          viewportId,
                        });
                        setIsPopoverOpen(false);
                      }}
                      {...enhancedProps}
                    />
                  </div>
                  <span className="text-[10px] text-white text-center truncate w-full leading-tight">
                    {toolLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Desktop: Show horizontal toolbar
  return (
    <div className="flex items-center gap-1 overflow-x-auto md:gap-2">
      {toolbarButtons?.map(toolDef => renderTool(toolDef))}
    </div>
  );
}
