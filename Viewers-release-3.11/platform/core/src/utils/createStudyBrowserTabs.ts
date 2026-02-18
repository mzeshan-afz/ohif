import { useSystem } from '../contextProviders/SystemProvider';

/**
 * Assigns UI series numbers to display sets based on their order within each study.
 * This ensures series numbers are available even when the sidebar is closed.
 *
 * @param {object} displaySetService - The display set service
 * @param {string[]} studyInstanceUIDs - Array of study instance UIDs
 */
export function assignSeriesNumbersToDisplaySets(displaySetService, studyInstanceUIDs) {
  if (!displaySetService || !studyInstanceUIDs || studyInstanceUIDs.length === 0) {
    return;
  }

  const activeDisplaySets = displaySetService.getActiveDisplaySets();
  if (!activeDisplaySets || activeDisplaySets.length === 0) {
    return;
  }

  // Group display sets by study
  const displaySetsByStudy = new Map();
  studyInstanceUIDs.forEach(studyUID => {
    displaySetsByStudy.set(studyUID, []);
  });

  activeDisplaySets.forEach(displaySet => {
    const studyUID = displaySet.StudyInstanceUID;
    if (displaySetsByStudy.has(studyUID)) {
      displaySetsByStudy.get(studyUID).push(displaySet);
    }
  });

  // Assign incrementing series numbers per study
  displaySetsByStudy.forEach((studyDisplaySets, studyUID) => {
    // Sort by SeriesInstanceUID for consistent ordering
    studyDisplaySets.sort((a, b) => {
      const uidA = a.SeriesInstanceUID || '';
      const uidB = b.SeriesInstanceUID || '';
      return uidA.localeCompare(uidB);
    });

    let seriesIndex = 1;
    studyDisplaySets.forEach(displaySet => {
      displaySet.uiSeriesNumber = seriesIndex++;
    });
  });
}

/**
 *
 * @param {string[]} primaryStudyInstanceUIDs
 * @param {object[]} studyDisplayList
 * @param {string} studyDisplayList.studyInstanceUid
 * @param {string} studyDisplayList.date
 * @param {string} studyDisplayList.description
 * @param {string} studyDisplayList.modalities
 * @param {number} studyDisplayList.numInstances
 * @param {object[]} displaySets
 * @param {number} recentTimeframe - The number of milliseconds to consider a study recent
 * @returns tabs - The prop object expected by the StudyBrowser component
 */

export function createStudyBrowserTabs(
  primaryStudyInstanceUIDs,
  studyDisplayList,
  displaySets,
  recentTimeframeMS = 31536000000
) {
  const { servicesManager } = useSystem();
  const { displaySetService } = servicesManager.services;

  const shouldSortBySeriesUID = process.env.TEST_ENV === 'true';
  const primaryStudies = [];
  const allStudies = [];

  studyDisplayList.forEach(study => {
    const displaySetsForStudy = displaySets.filter(
      ds => ds.StudyInstanceUID === study.studyInstanceUid
    );

    // sort them by seriesInstanceUID
    let sortedDisplaySets;
    if (shouldSortBySeriesUID) {
      sortedDisplaySets = displaySetsForStudy.sort((a, b) => {
        const displaySetA = displaySetService.getDisplaySetByUID(a.displaySetInstanceUID);
        const displaySetB = displaySetService.getDisplaySetByUID(b.displaySetInstanceUID);

        return displaySetA.SeriesInstanceUID.localeCompare(displaySetB.SeriesInstanceUID);
      });
    } else {
      sortedDisplaySets = displaySetsForStudy;
    }

    // Assign incrementing series numbers per study (UI only)
    // Store the UI series number on the actual display set for use in viewport overlays
    let seriesIndex = 1;
    const displaySetsWithSeriesNumbers = sortedDisplaySets.map(ds => {
      const displaySet = displaySetService.getDisplaySetByUID(ds.displaySetInstanceUID);
      if (displaySet) {
        // Store UI series number on the display set for overlay access
        displaySet.uiSeriesNumber = seriesIndex;
      }
      return {
        ...ds,
        seriesNumber: seriesIndex++,
      };
    });

    const tabStudy = Object.assign({}, study, {
      displaySets: displaySetsWithSeriesNumbers,
    });

    if (primaryStudyInstanceUIDs.includes(study.studyInstanceUid)) {
      primaryStudies.push(tabStudy);
    }
    allStudies.push(tabStudy);
  });

  const primaryStudiesTimestamps = primaryStudies
    .filter(study => study.date)
    .map(study => new Date(study.date).getTime());

  const recentStudies =
    primaryStudiesTimestamps.length > 0
      ? allStudies.filter(study => {
          const oldestPrimaryTimeStamp = Math.min(...primaryStudiesTimestamps);

          if (!study.date) {
            return false;
          }
          const studyTimeStamp = new Date(study.date).getTime();
          return oldestPrimaryTimeStamp - studyTimeStamp < recentTimeframeMS;
        })
      : [];

  // Newest first
  const _byDate = (a, b) => {
    const dateA = Date.parse(a);
    const dateB = Date.parse(b);

    return dateB - dateA;
  };

  const tabs = [
    {
      name: 'primary',
      label: 'Primary',
      studies: primaryStudies.sort((studyA, studyB) => _byDate(studyA.date, studyB.date)),
    },
    {
      name: 'recent',
      label: 'Recent',
      studies: recentStudies.sort((studyA, studyB) => _byDate(studyA.date, studyB.date)),
    },
    {
      name: 'all',
      label: 'All',
      studies: allStudies.sort((studyA, studyB) => _byDate(studyA.date, studyB.date)),
    },
  ];

  return tabs;
}
