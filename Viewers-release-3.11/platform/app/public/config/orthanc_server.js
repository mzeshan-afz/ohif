/** @type {AppTypes.Config} */
window.config = {
  routerBasename: null,
  extensions: [],
  modes: [],
  showStudyList: true,
  maxNumberOfWebWorkers: 3,
  showLoadingIndicator: true,
  showWarningMessageForCrossOrigin: true,
  showCPUFallbackMessage: true,
  strictZSpacingForVolumeViewport: true,
  defaultDataSourceName: 'orthanc',
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'orthanc',
      configuration: {
        friendlyName: 'Orthanc Server',
        name: 'Orthanc',
        // Orthanc DICOMweb endpoints
        wadoUriRoot: 'http://20.124.233.83:8042/dicom-web',
        qidoRoot: 'http://20.124.233.83:8042/dicom-web',
        wadoRoot: 'http://20.124.233.83:8042/dicom-web',
        // Authentication: Basic Auth with username:password format
        requestOptions: {
          auth: 'alice:alicePassword',
        },
        qidoSupportsIncludeField: true,
        supportsReject: true,
        dicomUploadEnabled: true,
        imageRendering: 'wadors',
        thumbnailRendering: 'wadors',
        enableStudyLazyLoad: true,
        supportsFuzzyMatching: true,
        supportsWildcard: true,
        omitQuotationForMultipartRequest: true,
        // Bulk data URI configuration
        bulkDataURI: {
          enabled: true,
        },
      },
    },
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomjson',
      sourceName: 'dicomjson',
      configuration: {
        friendlyName: 'dicom json',
        name: 'json',
      },
    },
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomlocal',
      sourceName: 'dicomlocal',
      configuration: {
        friendlyName: 'dicom local',
      },
    },
  ],
  httpErrorHandler: error => {
    console.warn(`HTTP Error Handler (status: ${error.status})`, error);
    // Handle specific error cases if needed
    if (error.status === 401) {
      console.error('Authentication failed. Please check your Orthanc credentials.');
    } else if (error.status === 403) {
      console.error('Access forbidden. Please check your Orthanc permissions.');
    }
  },
};

