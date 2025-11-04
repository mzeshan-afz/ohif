import React, { ReactNode } from 'react';
import classNames from 'classnames';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Icons,
  Button,
  ToolButton,
} from '../';
import { IconPresentationProvider } from '@ohif/ui-next';

import NavBar from '../NavBar';

// Todo: we should move this component to composition and remove props base

interface HeaderProps {
  children?: ReactNode;
  menuOptions: Array<{
    title: string;
    icon?: string;
    onClick: () => void;
  }>;
  isReturnEnabled?: boolean;
  onClickReturnButton?: () => void;
  isSticky?: boolean;
  WhiteLabeling?: {
    createLogoComponentFn?: (React: any, props: any) => ReactNode;
  };
  PatientInfo?: ReactNode;
  Secondary?: ReactNode;
  UndoRedo?: ReactNode;
  isMobile?: boolean;
  onToggleLeftPanel?: () => void;
  onToggleRightPanel?: () => void;
  leftPanelOpen?: boolean;
  rightPanelOpen?: boolean;
}

function Header({
  children,
  menuOptions,
  isReturnEnabled = true,
  onClickReturnButton,
  isSticky = false,
  WhiteLabeling,
  PatientInfo,
  UndoRedo,
  Secondary,
  isMobile = false,
  onToggleLeftPanel,
  onToggleRightPanel,
  leftPanelOpen = false,
  rightPanelOpen = false,
  ...props
}: HeaderProps): ReactNode {
  const onClickReturn = () => {
    if (isReturnEnabled && onClickReturnButton) {
      onClickReturnButton();
    }
  };

  return (
    <IconPresentationProvider
      size="large"
      IconContainer={ToolButton}
    >
      <NavBar
        isSticky={isSticky}
        {...props}
      >
        <div className={classNames(
          "relative h-[48px] items-center",
          isMobile ? "flex" : ""
        )}>
          {/* Left side: Mobile panel toggle, Return button, Logo */}
          <div className={classNames(
            'absolute top-1/2 flex -translate-y-1/2 items-center z-10',
            isMobile ? 'left-1 gap-1' : 'left-0 gap-2'
          )}>
            {/* Mobile: Left Panel Toggle */}
            {isMobile && onToggleLeftPanel && (
              <Button
                variant="ghost"
                size="icon"
                className="text-primary hover:bg-primary-dark h-8 w-8 flex-shrink-0 md:hidden"
                onClick={onToggleLeftPanel}
                aria-label={leftPanelOpen ? 'Close left panel' : 'Open left panel'}
              >
                {leftPanelOpen ? (
                  <Icons.Close className="h-5 w-5" />
                ) : (
                  <Icons.NavigationPanelReveal className="h-5 w-5 rotate-180" />
                )}
              </Button>
            )}
            
            <div
              className={classNames(
                'inline-flex items-center',
                isReturnEnabled && 'cursor-pointer',
                isMobile ? 'ml-0' : 'mr-3'
              )}
              onClick={onClickReturn}
              data-cy="return-to-work-list"
            >
              {isReturnEnabled && (
                <Icons.ArrowLeft className={classNames(
                  'text-primary',
                  isMobile ? 'h-5 w-5 ml-0.5' : 'h-7 w-7 ml-1'
                )} />
              )}
              <div className={isMobile ? 'ml-0.5' : 'ml-1'}>
                {WhiteLabeling?.createLogoComponentFn?.(React, props) || (
                  <Icons.OHIFLogo className={isMobile ? 'h-6 w-6' : ''} />
                )}
              </div>
            </div>
          </div>

          {/* Secondary toolbar - responsive positioning */}
          {Secondary && (
            <div className={classNames(
              'absolute top-1/2 h-8 -translate-y-1/2 overflow-x-auto z-10',
              isMobile ? 'left-[70px] max-w-[calc(50vw-120px)]' : 'left-[250px]'
            )}>
              <div className="flex items-center gap-1">
                {Secondary}
              </div>
            </div>
          )}

          {/* Center: Primary toolbar - Mobile: positioned to avoid overlap */}
          <div className={classNames(
            'absolute top-1/2 -translate-y-1/2 transform',
            isMobile 
              ? 'left-[80px] right-[210px] px-1 z-0 overflow-hidden' 
              : 'left-1/2 -translate-x-1/2 z-0'
          )}>
            <div className={classNames(
              'flex items-center justify-center',
              isMobile ? 'gap-0.5 overflow-x-auto w-full max-w-full' : 'space-x-2'
            )}>
              {children}
            </div>
          </div>

          {/* Right side: Undo/Redo, Patient Info, Menu, Mobile panel toggle */}
          <div className={classNames(
            'absolute top-1/2 flex -translate-y-1/2 select-none items-center z-10',
            isMobile ? 'right-1 gap-0.5' : 'right-0 gap-1'
          )}>
            {UndoRedo && (
              <>
                <div className={classNames(
                  isMobile ? 'flex items-center gap-0 flex-shrink-0' : ''
                )}>
                  {UndoRedo}
                </div>
                <div className={classNames(
                  'border-primary-dark h-[25px] border-r flex-shrink-0',
                  isMobile ? 'mx-0.5 w-[1px]' : 'mx-1.5'
                )}></div>
              </>
            )}
            {PatientInfo && (
              <>
                <div className={classNames(
                  isMobile ? 'max-w-[60px] overflow-hidden flex-shrink-0' : 'max-w-none'
                )}>
                  {PatientInfo}
                </div>
                <div className={classNames(
                  'border-primary-dark h-[25px] border-r flex-shrink-0',
                  isMobile ? 'mx-0.5 w-[1px]' : 'mx-1.5'
                )}></div>
              </>
            )}
            
            {/* Mobile: Right Panel Toggle */}
            {isMobile && onToggleRightPanel && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary hover:bg-primary-dark h-8 w-8 flex-shrink-0 md:hidden"
                  onClick={onToggleRightPanel}
                  aria-label={rightPanelOpen ? 'Close right panel' : 'Open right panel'}
                >
                  {rightPanelOpen ? (
                    <Icons.Close className="h-5 w-5" />
                  ) : (
                    <Icons.NavigationPanelReveal className="h-5 w-5" />
                  )}
                </Button>
                <div className="w-1 flex-shrink-0"></div>
              </>
            )}

            {/* Menu dropdown - Always last, always visible, never shrinks */}
            <div className="flex-shrink-0 relative z-20">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={classNames(
                      'text-primary hover:bg-primary-dark flex-shrink-0',
                      isMobile ? 'h-8 w-8' : 'h-full w-full mt-2'
                    )}
                  >
                    <Icons.GearSettings className={isMobile ? 'h-4 w-4' : ''} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {menuOptions.map((option, index) => {
                    const IconComponent = option.icon
                      ? Icons[option.icon as keyof typeof Icons]
                      : null;
                    return (
                      <DropdownMenuItem
                        key={index}
                        onSelect={option.onClick}
                        className="flex items-center gap-2 py-2"
                      >
                        {IconComponent && (
                          <span className="flex h-4 w-4 items-center justify-center">
                            <Icons.ByName name={IconComponent.name} />
                          </span>
                        )}
                        <span className="flex-1">{option.title}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </NavBar>
    </IconPresentationProvider>
  );
}

export default Header;
