import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';

import { Button, Header, Icons, useModal } from '@ohif/ui-next';
import { useSystem } from '@ohif/core';
import { Toolbar } from '../Toolbar/Toolbar';
import HeaderPatientInfo from './HeaderPatientInfo';
import { PatientInfoVisibility } from './HeaderPatientInfo/HeaderPatientInfo';
import { preserveQueryParameters } from '@ohif/app';
import { Types } from '@ohif/core';

interface ViewerHeaderProps {
  appConfig: AppTypes.Config;
  isMobile?: boolean;
  onToggleLeftPanel?: () => void;
  onToggleRightPanel?: () => void;
  leftPanelOpen?: boolean;
  rightPanelOpen?: boolean;
}

function ViewerHeader({
  appConfig,
  isMobile = false,
  onToggleLeftPanel,
  onToggleRightPanel,
  leftPanelOpen = false,
  rightPanelOpen = false,
}: ViewerHeaderProps) {
  const { servicesManager, extensionManager, commandsManager } = useSystem();
  const { customizationService } = servicesManager.services;

  const navigate = useNavigate();
  const location = useLocation();

  const onClickReturnButton = () => {
    const { pathname } = location;
    const dataSourceIdx = pathname.indexOf('/', 1);

    const dataSourceName = pathname.substring(dataSourceIdx + 1);
    const existingDataSource = extensionManager.getDataSources(dataSourceName);

    const searchQuery = new URLSearchParams();
    if (dataSourceIdx !== -1 && existingDataSource) {
      searchQuery.append('datasources', pathname.substring(dataSourceIdx + 1));
    }
    preserveQueryParameters(searchQuery);

    navigate({
      pathname: '/',
      search: decodeURIComponent(searchQuery.toString()),
    });
  };

  const { t } = useTranslation();
  const { show } = useModal();

  const AboutModal = customizationService.getCustomization(
    'ohif.aboutModal'
  ) as Types.MenuComponentCustomization;

  const UserPreferencesModal = customizationService.getCustomization(
    'ohif.userPreferencesModal'
  ) as Types.MenuComponentCustomization;

  const menuOptions = [
    {
      title: AboutModal?.menuTitle ?? t('Header:About'),
      icon: 'info',
      onClick: () =>
        show({
          content: AboutModal,
          title: AboutModal?.title ?? t('AboutModal:About OHIF Viewer'),
          containerClassName: AboutModal?.containerClassName ?? 'max-w-md',
        }),
    },
    {
      title: UserPreferencesModal.menuTitle ?? t('Header:Preferences'),
      icon: 'settings',
      onClick: () =>
        show({
          content: UserPreferencesModal,
          title: UserPreferencesModal.title ?? t('UserPreferencesModal:User preferences'),
          containerClassName:
            UserPreferencesModal?.containerClassName ?? 'flex max-w-4xl p-6 flex-col',
        }),
    },
  ];

  if (appConfig.oidc) {
    menuOptions.push({
      title: t('Header:Logout'),
      icon: 'power-off',
      onClick: async () => {
        navigate(`/logout?redirect_uri=${encodeURIComponent(window.location.href)}`);
      },
    });
  }

  return (
    <Header
      menuOptions={menuOptions}
      isReturnEnabled={!!appConfig.showStudyList}
      onClickReturnButton={onClickReturnButton}
      WhiteLabeling={appConfig.whiteLabeling}
      Secondary={<Toolbar buttonSection="secondary" />}
      PatientInfo={
        appConfig.showPatientInfo !== PatientInfoVisibility.DISABLED && (
          <HeaderPatientInfo
            servicesManager={servicesManager}
            appConfig={appConfig}
          />
        )
      }
      UndoRedo={
        <div className={classNames(
          "text-primary flex cursor-pointer items-center",
          isMobile ? "gap-0" : ""
        )}>
          <Button
            variant="ghost"
            className={classNames(
              "hover:bg-primary-dark flex-shrink-0",
              isMobile ? "h-7 w-7 p-0" : ""
            )}
            onClick={() => {
              commandsManager.run('undo');
            }}
          >
            <Icons.Undo className={isMobile ? "h-4 w-4" : ""} />
          </Button>
          <Button
            variant="ghost"
            className={classNames(
              "hover:bg-primary-dark flex-shrink-0",
              isMobile ? "h-7 w-7 p-0" : ""
            )}
            onClick={() => {
              commandsManager.run('redo');
            }}
          >
            <Icons.Redo className={isMobile ? "h-4 w-4" : ""} />
          </Button>
        </div>
      }
      isMobile={isMobile}
      onToggleLeftPanel={onToggleLeftPanel}
      onToggleRightPanel={onToggleRightPanel}
      leftPanelOpen={leftPanelOpen}
      rightPanelOpen={rightPanelOpen}
    >
      <div className="relative flex justify-center gap-[4px]">
        <Toolbar buttonSection="primary" />
      </div>
    </Header>
  );
}

export default ViewerHeader;
