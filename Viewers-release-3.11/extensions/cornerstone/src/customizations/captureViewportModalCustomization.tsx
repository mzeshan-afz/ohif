import React, { useState, useEffect } from 'react';
import { ImageModal, FooterAction } from '@ohif/ui-next';

const MAX_TEXTURE_SIZE = 10000;
const DEFAULT_FILENAME = 'image';

interface ViewportDownloadFormNewProps {
  onClose: () => void;
  defaultSize: number;
  fileTypeOptions: Array<{ value: string; label: string }>;
  viewportId: string;
  showAnnotations: boolean;
  onAnnotationsChange: (show: boolean) => void;
  dimensions: { width: number; height: number };
  onDimensionsChange: (dimensions: { width: number; height: number }) => void;
  onEnableViewport: (element: HTMLElement) => void;
  onDisableViewport: () => void;
  onDownload: (filename: string, fileType: string) => void;
  warningState: { enabled: boolean; value: string };
}

function ViewportDownloadFormNew({
  onClose,
  defaultSize,
  fileTypeOptions,
  viewportId,
  showAnnotations,
  onAnnotationsChange,
  dimensions,
  warningState,
  onDimensionsChange,
  onEnableViewport,
  onDisableViewport,
  onDownload,
}: ViewportDownloadFormNewProps) {
  const [viewportElement, setViewportElement] = useState<HTMLElement | null>(null);
  const [showWarningMessage, setShowWarningMessage] = useState(true);
  const [filename, setFilename] = useState(DEFAULT_FILENAME);
  const [fileType, setFileType] = useState('jpg');

  useEffect(() => {
    if (!viewportElement) {
      return;
    }

    onEnableViewport(viewportElement);

    return () => {
      onDisableViewport();
    };
  }, [onDisableViewport, onEnableViewport, viewportElement]);

  return (
    <ImageModal>
      <ImageModal.Body>
        <ImageModal.ImageVisual>
          <div
            style={{
              height: dimensions.height,
              width: dimensions.width,
              position: 'relative',
              maxWidth: '100%',
              maxHeight: '100%',
            }}
            className="max-w-full max-h-full"
            data-viewport-uid={viewportId}
            ref={setViewportElement}
          >
            {warningState.enabled && showWarningMessage && (
              <div
                className="text-foreground absolute left-1/2 bottom-[5px] z-[1000] -translate-x-1/2 rounded bg-black p-2 sm:p-3 text-[10px] sm:text-xs font-bold max-w-[90%] sm:max-w-none sm:whitespace-nowrap"
              >
                {warningState.value}
              </div>
            )}
          </div>
        </ImageModal.ImageVisual>

        <ImageModal.ImageOptions>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 sm:space-x-2">
            <div className="flex-1">
            <ImageModal.Filename
              value={filename}
              onChange={e => setFilename(e.target.value)}
            >
              File name
            </ImageModal.Filename>
            </div>
            <div className="flex-shrink-0">
            <ImageModal.Filetype
              selected={fileType}
              onSelect={setFileType}
              options={fileTypeOptions}
            />
            </div>
          </div>

          <ImageModal.ImageSize
            width={dimensions.width.toString()}
            height={dimensions.height.toString()}
            onWidthChange={e => {
              onDimensionsChange({
                ...dimensions,
                width: parseInt(e.target.value) || defaultSize,
              });
            }}
            onHeightChange={e => {
              onDimensionsChange({
                ...dimensions,
                height: parseInt(e.target.value) || defaultSize,
              });
            }}
            maxWidth={MAX_TEXTURE_SIZE.toString()}
            maxHeight={MAX_TEXTURE_SIZE.toString()}
          >
            Image size <span className="text-muted-foreground">px</span>
          </ImageModal.ImageSize>

          <ImageModal.SwitchOption
            defaultChecked={showAnnotations}
            checked={showAnnotations}
            onCheckedChange={onAnnotationsChange}
          >
            Include annotations
          </ImageModal.SwitchOption>
          {warningState.enabled && (
            <ImageModal.SwitchOption
              defaultChecked={showWarningMessage}
              checked={showWarningMessage}
              onCheckedChange={setShowWarningMessage}
            >
              Include warning message
            </ImageModal.SwitchOption>
          )}
          <FooterAction className="mt-2">
            <FooterAction.Right>
              <FooterAction.Secondary onClick={onClose}>Cancel</FooterAction.Secondary>
              <FooterAction.Primary
                onClick={() => {
                  onDownload(filename || DEFAULT_FILENAME, fileType);
                  onClose();
                }}
              >
                Save
              </FooterAction.Primary>
            </FooterAction.Right>
          </FooterAction>
        </ImageModal.ImageOptions>
      </ImageModal.Body>
    </ImageModal>
  );
}

export default {
  'ohif.captureViewportModal': ViewportDownloadFormNew,
};
