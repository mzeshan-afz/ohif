import React, { useState, useEffect } from 'react';
import usePatientInfo from '../../hooks/usePatientInfo';
import { Icons, Popover, PopoverTrigger, PopoverContent } from '@ohif/ui-next';

export enum PatientInfoVisibility {
  VISIBLE = 'visible',
  VISIBLE_COLLAPSED = 'visibleCollapsed',
  DISABLED = 'disabled',
  VISIBLE_READONLY = 'visibleReadOnly',
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

const formatWithEllipsis = (str, maxLength) => {
  if (str?.length > maxLength) {
    return str.substring(0, maxLength) + '...';
  }
  return str;
};

function HeaderPatientInfo({ servicesManager, appConfig }: withAppTypes) {
  const initialExpandedState =
    appConfig.showPatientInfo === PatientInfoVisibility.VISIBLE ||
    appConfig.showPatientInfo === PatientInfoVisibility.VISIBLE_READONLY;
  const [expanded, setExpanded] = useState(initialExpandedState);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { patientInfo, isMixedPatients } = usePatientInfo(servicesManager);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMixedPatients && expanded) {
      setExpanded(false);
    }
  }, [isMixedPatients, expanded]);

  const handleOnClick = () => {
    if (!isMixedPatients && appConfig.showPatientInfo !== PatientInfoVisibility.VISIBLE_READONLY) {
      if (isMobile) {
        setIsPopoverOpen(!isPopoverOpen);
      } else {
        setExpanded(!expanded);
      }
    }
  };

  const formattedPatientName = formatWithEllipsis(patientInfo.PatientName, 27);
  const formattedPatientID = formatWithEllipsis(patientInfo.PatientID, 15);

  // Patient info content (used in both mobile popover and desktop expanded view)
  const patientDetailsContent = (
    <div className="flex flex-col gap-2">
      <div className="text-[13px] font-bold text-white">
        {patientInfo.PatientName || 'N/A'}
      </div>
      <div className="flex flex-col gap-1.5 text-[11px] text-aqua-pale">
        <div className="flex items-center gap-2">
          <span className="text-primary-light">Patient ID:</span>
          <span>{patientInfo.PatientID || 'N/A'}</span>
        </div>
        {patientInfo.PatientSex && (
          <div className="flex items-center gap-2">
            <span className="text-primary-light">Sex:</span>
            <span>{patientInfo.PatientSex}</span>
          </div>
        )}
        {patientInfo.PatientDOB && (
          <div className="flex items-center gap-2">
            <span className="text-primary-light">DOB:</span>
            <span>{patientInfo.PatientDOB}</span>
          </div>
        )}
      </div>
    </div>
  );

  // Mobile: Use Popover
  if (isMobile) {
    return (
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <div
            className="hover:bg-primary-dark flex cursor-pointer items-center justify-center gap-0.5 rounded-lg max-w-full"
            onClick={handleOnClick}
          >
            {isMixedPatients ? (
              <Icons.MultiplePatients className="text-primary flex-shrink-0 h-3.5 w-3.5" />
            ) : (
              <Icons.Patient className="text-primary flex-shrink-0 h-3.5 w-3.5" />
            )}
            <div className="flex flex-col justify-center min-w-0">
              <div className="text-primary self-center text-[10px] truncate max-w-[50px]">
                {isMixedPatients ? 'Multiple' : 'Patient'}
              </div>
            </div>
            <Icons.ArrowLeft className={`text-primary flex-shrink-0 h-3 w-3 ${isPopoverOpen ? 'rotate-180' : ''}`} />
          </div>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="bottom"
          className="w-[220px] p-3"
          onClick={(e) => e.stopPropagation()}
        >
          {isMixedPatients ? (
            <div className="text-center text-white text-sm">
              Multiple Patients
            </div>
          ) : (
            patientDetailsContent
          )}
        </PopoverContent>
      </Popover>
    );
  }

  // Desktop: Use inline expansion
  return (
    <div
      className="hover:bg-primary-dark flex cursor-pointer items-center justify-center gap-0.5 rounded-lg max-w-full"
      onClick={handleOnClick}
    >
      {isMixedPatients ? (
        <Icons.MultiplePatients className="text-primary flex-shrink-0 h-5 w-5" />
      ) : (
        <Icons.Patient className="text-primary flex-shrink-0 h-5 w-5" />
      )}
      <div className="flex flex-col justify-center min-w-0">
        {expanded ? (
          <>
            <div className="self-start text-[13px] font-bold text-white truncate">
              {formattedPatientName}
            </div>
            <div className="text-aqua-pale flex gap-2 text-[11px]">
              <div>{formattedPatientID}</div>
              <div>{patientInfo.PatientSex}</div>
              <div>{patientInfo.PatientDOB}</div>
            </div>
          </>
        ) : (
          <div className="text-primary self-center text-[13px]">
            {isMixedPatients ? 'Multiple Patients' : 'Patient'}
          </div>
        )}
      </div>
      <Icons.ArrowLeft className={`text-primary flex-shrink-0 h-5 w-5 ${expanded ? 'rotate-180' : ''}`} />
    </div>
  );
}

export default HeaderPatientInfo;
